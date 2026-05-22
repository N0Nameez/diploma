#!/usr/bin/env python3
"""
test_motion_pipeline.py — Integration test for video_to_motion.py and motion_transfer.py.
"""
import os
import sys
import json
import subprocess
import shutil

def main():
    print("=== STARTING INTEGRATION TEST FOR MOTION PIPELINE ===")
    
    # 1. Paths
    generation_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(generation_dir)
    
    # Locate test video
    gradio_video = r"C:\Develop\diploma\Machine_learning\H3D1\venv\Lib\site-packages\gradio\media_assets\videos\a.mp4"
    if not os.path.exists(gradio_video):
        gradio_video = r"C:\Develop\diploma\Machine_learning\H3D1\venv\Lib\site-packages\gradio\media_assets\videos\b.mp4"
    
    if not os.path.exists(gradio_video):
        print(f"Error: Gradio test video not found at {gradio_video}")
        sys.exit(1)
        
    print(f"Using test video: {gradio_video}")
    
    # Output paths
    output_dir = os.path.join(generation_dir, "output")
    os.makedirs(output_dir, exist_ok=True)
    
    motion_json_path = os.path.join(output_dir, "test_motion_data.json")
    animation_glb_path = os.path.join(output_dir, "test_animation.glb")
    skeleton_path = os.path.join(generation_dir, "base_skeleton.glb")
    
    # Clean up previous runs
    for path in [motion_json_path, animation_glb_path]:
        if os.path.exists(path):
            os.remove(path)
            
    # 2. Run video_to_motion.py
    print("\n--- Running video_to_motion.py ---")
    python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python"
        
    cmd_extract = [
        python_exe,
        os.path.join(generation_dir, "video_to_motion.py"),
        "--input", gradio_video,
        "--output", motion_json_path,
        "--min_cutoff", "1.0",
        "--beta", "0.05"
    ]
    
    print(f"Command: {' '.join(cmd_extract)}")
    result_extract = subprocess.run(cmd_extract, capture_output=True, text=True)
    print("STDOUT:")
    print(result_extract.stdout)
    if result_extract.stderr:
        print("STDERR:")
        print(result_extract.stderr)
        
    if result_extract.returncode != 0 or not os.path.exists(motion_json_path):
        print("Error: video_to_motion.py failed!")
        sys.exit(1)
        
    print(f"Success: Motion JSON generated at {motion_json_path}")
    
    # 3. Check JSON content
    with open(motion_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"JSON info: FPS={data.get('fps')}, Total Frames={data.get('total_frames')}, Duration={data.get('duration_seconds')}s")
    
    # 4. Find Blender Path
    # We try to use the one defined in config.py or default locations
    blender_path = r"C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe"
    if not os.path.exists(blender_path):
        blender_path = "blender"
        
    print(f"\nUsing Blender path: {blender_path}")
    
    # 5. Run motion_transfer.py in Blender headless mode
    print("\n--- Running motion_transfer.py in Blender ---")
    cmd_blender = [
        blender_path,
        "-b",
        "-P", os.path.join(generation_dir, "motion_transfer.py"),
        "--",
        "--skeleton", skeleton_path,
        "--landmarks", motion_json_path,
        "--output", animation_glb_path
    ]
    
    print(f"Command: {' '.join(cmd_blender)}")
    result_blender = subprocess.run(cmd_blender, capture_output=True, text=True)
    print("STDOUT:")
    print(result_blender.stdout)
    if result_blender.stderr:
        print("STDERR:")
        print(result_blender.stderr)
        
    if result_blender.returncode != 0 or not os.path.exists(animation_glb_path):
        print("Error: motion_transfer.py in Blender failed!")
        sys.exit(1)
        
    print(f"Success: Animation GLB generated at {animation_glb_path}")
    print(f"File size: {os.path.getsize(animation_glb_path)} bytes")
    print("\n=== INTEGRATION TEST PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
