#!/usr/bin/env python3
"""
motion_transfer.py — Blender Python script to retarget MediaPipe landmarks to base skeleton.
Run with:
  blender -b -P motion_transfer.py -- --skeleton <path_to_skeleton_glb> --landmarks <path_to_json> --output <path_to_glb>
"""
import sys
import os
import json
import bpy
import mathutils

def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        try:
            skeleton_idx = argv.index("--skeleton")
            argv = argv[skeleton_idx:]
        except ValueError:
            argv = []
            
    import argparse
    parser = argparse.ArgumentParser(description="Retarget MediaPipe landmarks to base skeleton in Blender")
    parser.add_argument("--skeleton", type=str, required=True, help="Path to base skeleton GLB")
    parser.add_argument("--landmarks", type=str, required=True, help="Path to input landmarks JSON file")
    parser.add_argument("--output", type=str, required=True, help="Path to output animation GLB")
    return parser.parse_args(argv)

def main():
    args = parse_args()
    
    # 1. Reset scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # 2. Import base skeleton
    skeleton_path = os.path.abspath(args.skeleton)
    if not os.path.exists(skeleton_path):
        print(f"Error: Base skeleton not found at {skeleton_path}")
        sys.exit(1)
        
    print(f"Importing skeleton: {skeleton_path}...")
    bpy.ops.import_scene.gltf(filepath=skeleton_path)
    
    # Find armature
    armature_obj = None
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE':
            armature_obj = obj
            break
            
    if not armature_obj:
        print("Error: Armature not found in the skeleton GLB.")
        sys.exit(1)
        
    bpy.context.view_layer.objects.active = armature_obj
    
    # 3. Read landmarks JSON
    landmarks_path = os.path.abspath(args.landmarks)
    if not os.path.exists(landmarks_path):
        print(f"Error: Landmarks file not found at {landmarks_path}")
        sys.exit(1)
        
    with open(landmarks_path, 'r', encoding='utf-8') as f:
        motion_data = json.load(f)
        
    frames = motion_data.get("frames", [])
    fps = motion_data.get("fps", 30.0)
    print(f"Loaded {len(frames)} frames of motion data.")
    
    if not frames:
        print("Error: No frames found in motion data.")
        sys.exit(1)

    # 4. Set up Scene limits
    bpy.context.scene.frame_start = 0
    bpy.context.scene.frame_end = len(frames) - 1
    bpy.context.scene.render.fps = int(round(fps))

    # Switch to Pose Mode
    bpy.ops.object.mode_set(mode='POSE')
    
    # Ensure all bones are in Quaternion mode
    for pb in armature_obj.pose.bones:
        pb.rotation_mode = 'QUATERNION'
        pb.matrix_basis.identity()

    # Track first frame hips position for relative offset calculation
    first_hips_pos = None

    # Map bones to landmarks indices (start_joint, end_joint)
    # MediaPipe indices:
    # 11: L_shoulder, 12: R_shoulder, 13: L_elbow, 14: R_elbow, 15: L_wrist, 16: R_wrist
    # 23: L_hip, 24: R_hip, 25: L_knee, 26: R_knee, 27: L_ankle, 28: R_ankle
    # 29: L_heel, 30: R_heel, 31: L_foot_index, 32: R_foot_index
    # 19: L_index, 20: R_index
    bone_mapping = {
        "mixamorig:LeftArm": (11, 13),
        "mixamorig:LeftForeArm": (13, 15),
        "mixamorig:LeftHand": (15, 19),
        "mixamorig:RightArm": (12, 14),
        "mixamorig:RightForeArm": (14, 16),
        "mixamorig:RightHand": (16, 20),
        "mixamorig:LeftUpLeg": (23, 25),
        "mixamorig:LeftLeg": (25, 27),
        "mixamorig:LeftFoot": (27, 31),
        "mixamorig:RightUpLeg": (24, 26),
        "mixamorig:RightLeg": (26, 28),
        "mixamorig:RightFoot": (28, 32),
    }

    # Hierarchy processing order (parents must be processed before children)
    hierarchy_order = [
        "mixamorig:Hips",
        "mixamorig:Spine",
        "mixamorig:Spine1",
        "mixamorig:Spine2",
        "mixamorig:LeftArm",
        "mixamorig:LeftForeArm",
        "mixamorig:LeftHand",
        "mixamorig:RightArm",
        "mixamorig:RightForeArm",
        "mixamorig:RightHand",
        "mixamorig:LeftUpLeg",
        "mixamorig:LeftLeg",
        "mixamorig:LeftFoot",
        "mixamorig:RightUpLeg",
        "mixamorig:RightLeg",
        "mixamorig:RightFoot",
    ]

    # Let's bake keyframes frame by frame
    for frame_idx, frame_data in enumerate(frames):
        bpy.context.scene.frame_set(frame_idx)
        landmarks = frame_data.get("landmarks", {})
        
        if not landmarks:
            # Skip empty frames, let Blender interpolate or duplicate previous
            continue

        # Helper to get Vector from landmarks in Blender coordinate system
        # Blender: X (Right/Left), Y (Forward/Backward), Z (Up/Down)
        # MediaPipe: X (Right), Y (Down), Z (Forward/Depth)
        # Mapping: Blender X = -MP X, Blender Y = MP Z, Blender Z = -MP Y
        def get_joint_pos(idx):
            idx_str = str(idx)
            if idx_str not in landmarks:
                return None
            val = landmarks[idx_str]
            return mathutils.Vector((-val[0], val[2], -val[1]))

        # 1. Hips Translation & Rotation
        hips_l = get_joint_pos(23)
        hips_r = get_joint_pos(24)
        shoulder_l = get_joint_pos(11)
        shoulder_r = get_joint_pos(12)

        if hips_l and hips_r:
            current_hips_pos = (hips_l + hips_r) / 2.0
            
            if first_hips_pos is None:
                first_hips_pos = current_hips_pos.copy()
            
            # Relative displacement
            hips_offset = current_hips_pos - first_hips_pos
            
            # Apply to pose Hips bone
            hips_bone = armature_obj.pose.bones.get("mixamorig:Hips")
            if hips_bone:
                # Set translation
                hips_bone.location = hips_bone.bone.head_local + hips_offset
                
                # Spine direction and hips orientation
                if shoulder_l and shoulder_r:
                    spine_dir = ((shoulder_l + shoulder_r) / 2.0) - current_hips_pos
                    hips_vec = hips_l - hips_r
                    
                    # Compute rotation matrix to orient Hips
                    # Y-axis (forward) is orthogonal to spine and hip vectors
                    y_axis = hips_vec.cross(spine_dir).normalized()
                    x_axis = hips_vec.normalized()
                    z_axis = x_axis.cross(y_axis).normalized()
                    
                    rot_mat = mathutils.Matrix((x_axis, y_axis, z_axis)).transposed()
                    
                    # Convert to quaternion
                    rot_q = rot_mat.to_quaternion()
                    
                    # Hips rest rotation is identity, apply difference
                    hips_bone.rotation_quaternion = rot_q
                
                hips_bone.keyframe_insert(data_path="location")
                hips_bone.keyframe_insert(data_path="rotation_quaternion")

        # 2. Spine orientation
        spine_bone = armature_obj.pose.bones.get("mixamorig:Spine")
        if spine_bone and hips_l and hips_r and shoulder_l and shoulder_r:
            hips_mid = (hips_l + hips_r) / 2.0
            shoulder_mid = (shoulder_l + shoulder_r) / 2.0
            target_spine_vec = (shoulder_mid - hips_mid).normalized()
            
            rest_spine_vec = (spine_bone.bone.tail_local - spine_bone.bone.head_local).normalized()
            rot_q = rest_spine_vec.rotation_difference(target_spine_vec)
            
            spine_bone.rotation_quaternion = rot_q
            spine_bone.keyframe_insert(data_path="rotation_quaternion")

        # 3. Posing and retargeting limbs
        for bone_name in hierarchy_order:
            if bone_name in ["mixamorig:Hips", "mixamorig:Spine"]:
                continue
                
            pb = armature_obj.pose.bones.get(bone_name)
            if not pb:
                continue

            mapping = bone_mapping.get(bone_name)
            if not mapping:
                continue
                
            start_idx, end_idx = mapping
            p_start = get_joint_pos(start_idx)
            p_end = get_joint_pos(end_idx)
            
            if p_start and p_end:
                # Target vector pointing along the limb
                v_target = (p_end - p_start).normalized()
                
                # Rest bone vector in armature space
                v_rest = (pb.bone.tail_local - pb.bone.head_local).normalized()
                
                # We need to find the rotation of this bone relative to parent
                # Since we pose hierarchically, we compute the target orientation in armature space
                rot_armature = v_rest.rotation_difference(v_target)
                
                # Set matrix in armature space to align orientation and preserve skeleton connectivity
                # Retrieve parent tail position to anchor the child bone
                p_tail = pb.parent.tail if pb.parent else pb.bone.head_local
                
                mat = rot_armature.to_matrix().to_4x4()
                mat.translation = p_tail
                
                # Assign armature-space matrix
                pb.matrix = mat
                
                # Insert keyframes
                pb.keyframe_insert(data_path="rotation_quaternion")

    # 5. Export clean animated GLB
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Rename action to 'mixamo.com' or generic 'Action' for web player compatibility
    if armature_obj.animation_data and armature_obj.animation_data.action:
        armature_obj.animation_data.action.name = "Action"

    output_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    print(f"Exporting animation to {output_path}...")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_animations=True
    )
    print("Export completed successfully.")

if __name__ == "__main__":
    main()
