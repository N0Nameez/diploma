#!/usr/bin/env python3
"""
video_to_motion.py — Extracts 3D pose landmarks from video using MediaPipe Pose and filters noise.
Usage:
  python video_to_motion.py --input <path_to_video> --output <path_to_json>
"""
import os
import sys
import argparse
import json
import math
import cv2
import mediapipe as mp


class LowPassFilter:
    """Simple low-pass filter."""
    def __init__(self, alpha: float):
        self.alpha = alpha
        self.y = None

    def __call__(self, value: float) -> float:
        if self.y is None:
            self.y = value
        else:
            self.y = self.alpha * value + (1.0 - self.alpha) * self.y
        return self.y


class OneEuroFilter:
    """1€ filter for jitter reduction in real-time landmark tracking."""
    def __init__(self, t0: float, x0: float, dx0: float = 0.0, mincutoff: float = 1.0, beta: float = 0.0, dcutoff: float = 1.0):
        self.mincutoff = float(mincutoff)
        self.beta = float(beta)
        self.dcutoff = float(dcutoff)
        self.x_filt = LowPassFilter(self._alpha(self.mincutoff, 1.0))
        self.dx_filt = LowPassFilter(self._alpha(self.dcutoff, 1.0))
        self.t_prev = float(t0)
        self.x_prev = float(x0)

    def _alpha(self, cutoff: float, dt: float) -> float:
        if dt <= 0:
            return 1.0
        tau = 1.0 / (2 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)

    def __call__(self, t: float, x: float) -> float:
        dt = t - self.t_prev
        if dt <= 0:
            return self.x_prev
        
        # Calculate derivative
        dx = (x - self.x_prev) / dt
        
        # Filter derivative
        alpha_d = self._alpha(self.dcutoff, dt)
        self.dx_filt.alpha = alpha_d
        dx_hat = self.dx_filt(dx)
        
        # Calculate cutoff based on speed
        cutoff = self.mincutoff + self.beta * abs(dx_hat)
        
        # Filter value
        alpha_x = self._alpha(cutoff, dt)
        self.x_filt.alpha = alpha_x
        x_hat = self.x_filt(x)
        
        # Update history
        self.t_prev = t
        self.x_prev = x_hat
        return x_hat


def process_video(video_path: str, output_path: str, min_cutoff: float = 1.0, beta: float = 0.05):
    """
    Process video using OpenCV and MediaPipe Pose, apply 1€ Filter to smooth, and save JSON.
    """
    if not os.path.exists(video_path):
        print(f"Error: Video file not found at {video_path}")
        sys.exit(1)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or math.isnan(fps):
        fps = 30.0  # Fallback
    
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Processing video: {video_path}")
    print(f"FPS: {fps}, Total Frames: {total_frames}")

    # Initialize MediaPipe Pose Tasks Landmarker
    BaseOptions = mp.tasks.BaseOptions
    PoseLandmarker = mp.tasks.vision.PoseLandmarker
    PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    model_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        'pose_landmarker_heavy.task'
    )
    if not os.path.exists(model_path):
        print(f"Error: Pose landmarker model not found at {model_path}")
        sys.exit(1)

    options = PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5
    )
    detector = PoseLandmarker.create_from_options(options)

    # Initialize 1 Euro Filters for 33 landmarks (X, Y, Z coordinates)
    filters = {}  # Format: landmark_idx: {'x': Filter, 'y': Filter, 'z': Filter}
    
    frames_data = []
    frame_idx = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Convert the frame to RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame_rgb)
        results = detector.detect(mp_image)

        timestamp = frame_idx / fps
        frame_landmarks = {}

        if results.pose_world_landmarks and len(results.pose_world_landmarks) > 0:
            world_landmarks = results.pose_world_landmarks[0]
            # We use pose_world_landmarks for metric 3D coordinates
            for idx, lm in enumerate(world_landmarks):
                # Apply 1 Euro Filter
                if idx not in filters:
                    filters[idx] = {
                        'x': OneEuroFilter(timestamp, lm.x, mincutoff=min_cutoff, beta=beta),
                        'y': OneEuroFilter(timestamp, lm.y, mincutoff=min_cutoff, beta=beta),
                        'z': OneEuroFilter(timestamp, lm.z, mincutoff=min_cutoff, beta=beta)
                    }
                    filtered_x, filtered_y, filtered_z = lm.x, lm.y, lm.z
                else:
                    filtered_x = filters[idx]['x'](timestamp, lm.x)
                    filtered_y = filters[idx]['y'](timestamp, lm.y)
                    filtered_z = filters[idx]['z'](timestamp, lm.z)

                frame_landmarks[str(idx)] = [
                    float(filtered_x),
                    float(filtered_y),
                    float(filtered_z),
                    float(lm.visibility)
                ]
            
            frames_data.append({
                "frame": frame_idx,
                "timestamp": timestamp,
                "landmarks": frame_landmarks
            })
        else:
            # If tracking is lost, repeat the last frame's landmarks if available
            if frames_data:
                frames_data.append({
                    "frame": frame_idx,
                    "timestamp": timestamp,
                    "landmarks": frames_data[-1]["landmarks"]
                })
            else:
                frames_data.append({
                    "frame": frame_idx,
                    "timestamp": timestamp,
                    "landmarks": {}
                })

        frame_idx += 1
        if frame_idx % 30 == 0:
            print(f"Processed {frame_idx}/{total_frames} frames...")

    cap.release()
    detector.close()

    # Save to JSON
    output_data = {
        "fps": fps,
        "total_frames": len(frames_data),
        "duration_seconds": len(frames_data) / fps,
        "frames": frames_data
    }

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(f"Successfully processed {len(frames_data)} frames. Output saved to: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract 3D Pose landmarks from video.")
    parser.add_argument("--input", type=str, required=True, help="Path to input video file")
    parser.add_argument("--output", type=str, required=True, help="Path to output landmarks JSON file")
    parser.add_argument("--min_cutoff", type=float, default=1.0, help="1 Euro Filter min cutoff frequency")
    parser.add_argument("--beta", type=float, default=0.05, help="1 Euro Filter beta parameter")
    args = parser.parse_args()

    process_video(args.input, args.output, args.min_cutoff, args.beta)
