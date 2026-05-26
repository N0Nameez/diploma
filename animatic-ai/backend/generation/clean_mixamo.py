"""
clean_mixamo.py — Blender Python script to clean Mixamo FBX animations and export clean GLB files.
Run with:
blender -b -P clean_mixamo.py -- --input <path_to_fbx> --output <path_to_glb> [--export-skeleton <path_to_skeleton_glb>]
"""
import sys
import os
import bpy

def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        # If '--' is not in argv, search if '--input' is in the arguments. If so, filter and use arguments from there.
        try:
            input_idx = argv.index("--input")
            argv = argv[input_idx:]
        except ValueError:
            argv = []
            
    print("DEBUG: sys.argv =", sys.argv)
    print("DEBUG: parsed argv =", argv)
    
    import argparse
    parser = argparse.ArgumentParser(description="Clean Mixamo FBX animations for Web Viewer")
    parser.add_argument("--input", type=str, required=True, help="Path to input FBX/GLB file")
    parser.add_argument("--output", type=str, required=True, help="Path to output clean GLB file")
    parser.add_argument("--export-skeleton", type=str, default="", help="Optional path to export base skeleton (T-pose) GLB")
    return parser.parse_args(argv)

def clean_and_export():
    args = parse_args()
    
    # 1. Reset Blender scene to empty
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # 2. Import the FBX/GLB file
    input_path = os.path.abspath(args.input)
    if not os.path.exists(input_path):
        print(f"Error: Input file not found at {input_path}")
        sys.exit(1)
        
    ext = os.path.splitext(input_path)[1].lower()
    print(f"Importing {input_path}...")
    if ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=input_path)
    elif ext in [".glb", ".gltf"]:
        bpy.ops.import_scene.gltf(filepath=input_path)
    else:
        print(f"Error: Unsupported file format {ext}")
        sys.exit(1)
        
    # 3. Find Armature and collect meshes/other objects to delete
    armature_obj = None
    objs_to_delete = []
    
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE':
            armature_obj = obj
            print(f"Found Armature: {obj.name}")
        else:
            objs_to_delete.append(obj)
            
    if not armature_obj:
        print("Error: No Armature found in the imported file.")
        sys.exit(1)
        
    # 3b. Normalize Armature: Apply all transforms to ensure it's at origin with no rotation/scale
    bpy.ops.object.select_all(action='DESELECT')
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    
    # Ensure the armature is at the origin and has identity rotation/scale
    # Mixamo FBX often comes with a -90 or 90 degree rotation on X
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # 3c. Delete everything else
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objs_to_delete:
        obj.select_set(True)
    bpy.ops.object.delete()
    
    # Clean up orphaned meshes, materials, images, and textures
    for mesh in list(bpy.data.meshes):
        bpy.data.meshes.remove(mesh)
    for mat in list(bpy.data.materials):
        bpy.data.materials.remove(mat)
    for img in list(bpy.data.images):
        bpy.data.images.remove(img)
        
    print("Cleaned scene: deleted meshes, materials, lights, and cameras.")
    
    # 4. Optional: Export base skeleton (T-pose / rest pose) without animations
    if args.export_skeleton:
        skeleton_path = os.path.abspath(args.export_skeleton)
        os.makedirs(os.path.dirname(skeleton_path), exist_ok=True)
        
        # Temporary stash animation data
        animation_data = armature_obj.animation_data
        action = None
        if animation_data:
            action = animation_data.action
            # Temporarily clear action to put armature in Rest Pose (T-pose)
            animation_data.action = None
        
        # Switch to Pose mode, select all bones, and clear transformations to ensure T-pose
        bpy.context.view_layer.objects.active = armature_obj
        bpy.ops.object.mode_set(mode='POSE')
        for bone in armature_obj.pose.bones:
            bone.matrix_basis.identity()
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # Export skeleton in T-pose
        print(f"Exporting base skeleton to {skeleton_path}...")
        bpy.ops.export_scene.gltf(
            filepath=skeleton_path,
            export_format='GLB',
            export_animations=False # No animation for base skeleton
        )
        
        # Restore animation data
        if animation_data and action:
            animation_data.action = action
            
    # 5. Rename Action and export clean animation GLB
    output_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    if armature_obj.animation_data and armature_obj.animation_data.action:
        action = armature_obj.animation_data.action
        # Use filename as action name (without extension and _clean suffix)
        action_name = os.path.splitext(os.path.basename(output_path))[0].replace("_clean", "")
        action.name = action_name
        print(f"Renamed Action to: {action.name}")
    else:
        print("Warning: No animation Action found on Armature.")
        
    print(f"Exporting clean animation to {output_path}...")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_animations=True,
        export_anim_single_armature=True
    )
    print("Done! Clean animation exported successfully.")

if __name__ == "__main__":
    clean_and_export()
