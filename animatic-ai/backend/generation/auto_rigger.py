"""
auto_rigger.py — Blender Python script to automatically rig a 3D model (GLB) using a base skeleton.
Run with:
blender -b -P auto_rigger.py -- --input <path_to_model_glb> --skeleton <path_to_skeleton_glb> --output <path_to_output_glb>
"""
import sys
import os
import bpy
import mathutils

def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        try:
            input_idx = argv.index("--input")
            argv = argv[input_idx:]
        except ValueError:
            argv = []
            
    print("DEBUG: sys.argv =", sys.argv)
    print("DEBUG: parsed argv =", argv)
    
    import argparse
    parser = argparse.ArgumentParser(description="Auto rig GLB models with base skeleton in Blender")
    parser.add_argument("--input", type=str, required=True, help="Path to input 3D model GLB")
    parser.add_argument("--skeleton", type=str, required=True, help="Path to base skeleton GLB")
    parser.add_argument("--output", type=str, required=True, help="Path to output rigged GLB")
    return parser.parse_args(argv)

def get_mesh_bbox(objects):
    min_x, min_y, min_z = float('inf'), float('inf'), float('inf')
    max_x, max_y, max_z = float('-inf'), float('-inf'), float('-inf')
    has_mesh = False
    
    for obj in objects:
        if obj.type == 'MESH':
            has_mesh = True
            for vertex in obj.bound_box:
                world_vertex = obj.matrix_world @ mathutils.Vector(vertex)
                min_x = min(min_x, world_vertex.x)
                min_y = min(min_y, world_vertex.y)
                min_z = min(min_z, world_vertex.z)
                max_x = max(max_x, world_vertex.x)
                max_y = max(max_y, world_vertex.y)
                max_z = max(max_z, world_vertex.z)
                
    if not has_mesh:
        return None, None
    return mathutils.Vector((min_x, min_y, min_z)), mathutils.Vector((max_x, max_y, max_z))

def main():
    args = parse_args()
    
    # 1. Reset scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    
    # 2. Import generated model GLB
    input_path = os.path.abspath(args.input)
    if not os.path.exists(input_path):
        print(f"Error: Input model file not found at {input_path}")
        sys.exit(1)
        
    print(f"Importing model: {input_path}...")
    bpy.ops.import_scene.gltf(filepath=input_path)
    
    # Save a list of imported mesh objects
    model_meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    if not model_meshes:
        print("Error: No meshes found in the imported model.")
        sys.exit(1)
        
    # Unparent meshes and apply transforms to model meshes immediately
    print("Unparenting meshes and applying transformations to model meshes...")
    for mesh_obj in model_meshes:
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        bpy.context.view_layer.objects.active = mesh_obj
        # Clear parent and keep world transformation
        if mesh_obj.parent:
            print(f"Clearing parent '{mesh_obj.parent.name}' for '{mesh_obj.name}'...")
            bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
        # Apply transformation
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        
    # Delete empty objects that are not part of any armature to clean the scene
    for obj in list(bpy.data.objects):
        if obj.type == 'EMPTY' and not obj.name.startswith("mixamorig"):
            print(f"Deleting imported empty node: '{obj.name}'...")
            bpy.data.objects.remove(obj)
            
    # Calculate global center of mass (weighted center) and global size before separation for accurate noise filtering
    total_co = mathutils.Vector((0, 0, 0))
    total_verts = 0
    for obj in model_meshes:
        for v in obj.data.vertices:
            total_co += obj.matrix_world @ v.co
            total_verts += 1
    weighted_center = total_co / total_verts if total_verts > 0 else mathutils.Vector((0, 0, 0))
    
    global_min, global_max = get_mesh_bbox(model_meshes)
    global_size = global_max - global_min if global_min else mathutils.Vector((1, 1, 1))
    print(f"DEBUG: Weighted center = {weighted_center}, Global size = {global_size}")
    
    # Noise/floating parts cleaning from the model mesh
    print("Separating loose parts for noise cleaning...")
    original_model_meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    
    for mesh_obj in original_model_meshes:
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        bpy.context.view_layer.objects.active = mesh_obj
        
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.separate(type='LOOSE')
        bpy.ops.object.mode_set(mode='OBJECT')
        
    all_loose_meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
    print(f"After separation: {len(all_loose_meshes)} loose parts found.")
    
    if all_loose_meshes:
        # Find the main body mesh (the one with the maximum vertices)
        main_mesh = max(all_loose_meshes, key=lambda o: len(o.data.vertices))
        
        # Identify noise parts to delete
        to_delete = []
        for mesh in all_loose_meshes:
            if mesh == main_mesh:
                continue
            
            # Count vertices
            vert_count = len(mesh.data.vertices)
            if vert_count == 0:
                to_delete.append(mesh)
                continue
            
            # Calculate bbox center of this part
            min_x = min(v.co.x for v in mesh.data.vertices)
            max_x = max(v.co.x for v in mesh.data.vertices)
            min_y = min(v.co.y for v in mesh.data.vertices)
            max_y = max(v.co.y for v in mesh.data.vertices)
            min_z = min(v.co.z for v in mesh.data.vertices)
            max_z = max(v.co.z for v in mesh.data.vertices)
            part_center = mathutils.Vector(((min_x+max_x)/2.0, (min_y+max_y)/2.0, (min_z+max_z)/2.0))
            
            dist_to_center = (part_center - weighted_center).length
            dist_x = abs(part_center.x - weighted_center.x)
            
            # Delete if vertices count is small AND it's far from the center (horizontally or in total distance)
            if vert_count < 50:
                if dist_x > 0.4 * global_size.x or dist_to_center > 0.5 * global_size.z:
                    print(f"Deleting noise part '{mesh.name}' (vertices={vert_count}, center={part_center}, dist_x={dist_x:.3f}m, dist={dist_to_center:.3f}m)")
                    to_delete.append(mesh)
                
        # Delete noise meshes
        for mesh in to_delete:
            bpy.data.objects.remove(mesh)
            
        # Re-fetch remaining meshes
        remaining_meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
        
        # Join them back into a single object
        if remaining_meshes:
            bpy.ops.object.select_all(action='DESELECT')
            for mesh in remaining_meshes:
                mesh.select_set(True)
            bpy.context.view_layer.objects.active = main_mesh
            bpy.ops.object.join()
            model_meshes = [main_mesh]
        else:
            model_meshes = original_model_meshes
    else:
        model_meshes = original_model_meshes
        
    # Clean model meshes to prevent Bone Heat Weighting failure
    print("Cleaning model meshes (Merge double vertices and recalculate normals)...")
    for mesh_obj in model_meshes:
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        bpy.context.view_layer.objects.active = mesh_obj
        
        # Go to Edit Mode
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        
        # 1. Merge vertices by distance (remove doubles)
        bpy.ops.mesh.remove_doubles(threshold=0.001)
        
        # 2. Recalculate normals outwards
        bpy.ops.mesh.normals_make_consistent(inside=False)
        
        # Go back to Object Mode
        bpy.ops.object.mode_set(mode='OBJECT')
        
    # Calculate bounding box of the generated model mesh
    min_vec, max_vec = get_mesh_bbox(model_meshes)
    if min_vec is None:
        print("Error: Bounding box calculation failed.")
        sys.exit(1)
        
    model_size = max_vec - min_vec
    model_center = (min_vec + max_vec) / 2.0
    print(f"Model Bounding Box: min={min_vec}, max={max_vec}, size={model_size}, center={model_center}")
    
    # 3. Import base skeleton
    skeleton_path = os.path.abspath(args.skeleton)
    if not os.path.exists(skeleton_path):
        print(f"Error: Base skeleton file not found at {skeleton_path}")
        sys.exit(1)
        
    print(f"Importing base skeleton: {skeleton_path}...")
    bpy.ops.import_scene.gltf(filepath=skeleton_path)
    
    # Find the imported skeleton armature
    armature_obj = None
    for obj in bpy.data.objects:
        if obj.type == 'ARMATURE' and obj not in model_meshes:
            armature_obj = obj
            break
            
    if not armature_obj:
        print("Error: Armature not found in the skeleton file.")
        sys.exit(1)
        
    # Clear custom shapes from all bones to release dependency on helper meshes (like Icosphere)
    print("Clearing bone custom shapes...")
    for bone in armature_obj.pose.bones:
        bone.custom_shape = None
        
    # Delete skeleton helper objects (like Icosphere or extra empty nodes)
    print("Cleaning helper skeleton objects...")
    for obj in list(bpy.data.objects):
        if obj != armature_obj and obj not in model_meshes:
            if obj.type in ['MESH', 'EMPTY']:
                print(f"Deleting skeleton helper object: '{obj.name}' of type {obj.type}...")
                bpy.data.objects.remove(obj)
        
    # Apply transforms to skeleton immediately after import
    print("Applying transformations to base skeleton...")
    bpy.ops.object.select_all(action='DESELECT')
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Reset pose transforms to ensure Rest Pose is active
    print("Resetting skeleton pose transforms to Rest Pose...")
    bpy.ops.object.mode_set(mode='POSE')
    for pbone in armature_obj.pose.bones:
        pbone.location = (0, 0, 0)
        pbone.rotation_quaternion = (1, 0, 0, 0)
        pbone.rotation_axis_angle = (0, 0, 1, 0)
        pbone.rotation_euler = (0, 0, 0)
        pbone.scale = (1, 1, 1)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Align bone tails in EDIT mode
    print("Correcting bone tails in EDIT mode...")
    bpy.ops.object.select_all(action='DESELECT')
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    
    bpy.ops.object.mode_set(mode='EDIT')
    for bone in armature_obj.data.edit_bones:
        children = bone.children
        if children:
            # If multiple children, try to find a child that aligns with the natural flow
            target_child = children[0]
            if len(children) > 1:
                # If this is Hips, prefer Spine
                if "Hips" in bone.name:
                    for child in children:
                        if "Spine" in child.name:
                            target_child = child
                            break
                # If this is Spine/Chest, prefer Spine/Chest/Neck
                elif any(x in bone.name for x in ["Spine", "Chest"]):
                    for child in children:
                        if any(x in child.name for x in ["Spine", "Chest", "Neck"]):
                            target_child = child
                            break
                # If this is LeftHand/RightHand, prefer Middle or Index finger
                elif "Hand" in bone.name:
                    for child in children:
                        if "Middle" in child.name or "Index" in child.name:
                            target_child = child
                            break
            bone.tail = target_child.head
        else:
            # End bone - extend in the direction from parent by 5cm
            if bone.parent:
                dir_vec = bone.head - bone.parent.head
                if dir_vec.length > 0.001:
                    direction = dir_vec.normalized()
                else:
                    direction = mathutils.Vector((0, 0, 1))
                bone.tail = bone.head + direction * 0.05
            else:
                bone.tail = bone.head + mathutils.Vector((0, 0, 0.05))
                
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Calculate skeleton size (Joints-only)
    # Use bone.head_local (actual joints) to measure the skeleton dimensions
    skel_min_z = float('inf')
    skel_max_z = float('-inf')
    skel_min_x = float('inf')
    skel_max_x = float('-inf')
    skel_min_y = float('inf')
    skel_max_y = float('-inf')
    
    for bone in armature_obj.data.bones:
        head_world = armature_obj.matrix_world @ bone.head_local
        skel_min_z = min(skel_min_z, head_world.z)
        skel_max_z = max(skel_max_z, head_world.z)
        skel_min_x = min(skel_min_x, head_world.x)
        skel_max_x = max(skel_max_x, head_world.x)
        skel_min_y = min(skel_min_y, head_world.y)
        skel_max_y = max(skel_max_y, head_world.y)
        
    skel_height = skel_max_z - skel_min_z
    skel_width = skel_max_x - skel_min_x
    skel_depth = skel_max_y - skel_min_y
    skel_center_y = (skel_min_y + skel_max_y) / 2.0
    print(f"Skeleton joints dimensions: height={skel_height}, width={skel_width}, depth={skel_depth}, center_y={skel_center_y}")
    
    # 4. Scale and position skeleton to match the model's bounding box
    scale_factor = model_size.z / skel_height if skel_height > 0 else 1.0
    
    # Scale armature
    armature_obj.scale = (scale_factor, scale_factor, scale_factor)
    bpy.context.view_layer.update()
    
    # Position armature: 
    # Center X of the skeleton joints to match center X of the model mesh.
    # Align bottom of skeleton (feet) to the bottom of the model (min_vec.z).
    new_skel_min_z = skel_min_z * scale_factor
    z_offset = min_vec.z - new_skel_min_z
    
    # Find anatomical Y-center of the torso to align the spine
    torso_y_coords = []
    for mesh_obj in model_meshes:
        for v in mesh_obj.data.vertices:
            co = mesh_obj.matrix_world @ v.co
            # General torso filter:
            # X must be within 15% of the total width around the center X
            # Z must be in the middle 30% to 80% range of the model height
            if (abs(co.x - model_center.x) < 0.15 * model_size.x and 
                (min_vec.z + 0.3 * model_size.z) < co.z < (min_vec.z + 0.8 * model_size.z)):
                torso_y_coords.append(co.y)
    
    if torso_y_coords:
        avg_torso_y = sum(torso_y_coords) / len(torso_y_coords)
    else:
        avg_torso_y = model_center.y
    print(f"Torso analysis: found {len(torso_y_coords)} torso vertices. Average torso Y = {avg_torso_y:.6f}")
    
    # Find core spine bones average local Y coordinates
    core_bone_names = ["Hips", "Spine", "Spine1", "Spine2", "Neck", "Head"]
    core_y_coords = []
    for bone in armature_obj.data.bones:
        if any(name in bone.name for name in core_bone_names):
            core_y_coords.append(bone.head_local.y)
            
    if core_y_coords:
        avg_core_y = sum(core_y_coords) / len(core_y_coords)
    else:
        avg_core_y = skel_center_y
    print(f"Skeleton core analysis: found {len(core_y_coords)} core bones. Average core Y = {avg_core_y:.6f}")
    
    # Align core spine bones with torso center along Y
    y_offset = avg_torso_y - (avg_core_y * scale_factor)
    
    armature_obj.location.x = model_center.x
    armature_obj.location.y = y_offset
    armature_obj.location.z = z_offset
    bpy.context.view_layer.update()
    
    print(f"Positioned and scaled armature. Scale: {scale_factor}, Location: {armature_obj.location}")
    
    # Apply transformations for final placement
    bpy.ops.object.select_all(action='DESELECT')
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # 5. Parent mesh(es) to armature (Skinning)
    bpy.ops.object.select_all(action='DESELECT')
    for mesh_obj in model_meshes:
        mesh_obj.select_set(True)
        
    # Active object must be the armature
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    
    print("Performing skinning (parenting with AUTOMATIC_WEIGHTS)...")
    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        print("Skinning with AUTOMATIC_WEIGHTS completed successfully!")
    except Exception as e:
        print(f"Error during automatic skinning: {e}")
        # Fallback to envelope weights if auto weights fails
        print("Falling back to parenting with ENVELOPE_WEIGHTS...")
        try:
            bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
            print("Skinning with ENVELOPE_WEIGHTS completed successfully!")
        except Exception as e2:
            print(f"Error during envelope skinning: {e2}")
            print("Falling back to parenting with EMPTY_GROUPS...")
            bpy.ops.object.parent_set(type='ARMATURE_NONE')
            
    # 6. Create custom test animation to check deformation (Arm swing)
    print("Creating test animation for RightArm and LeftArm...")
    bpy.ops.object.mode_set(mode='POSE')
    pbone_r = armature_obj.pose.bones.get("mixamorig:RightArm")
    pbone_l = armature_obj.pose.bones.get("mixamorig:LeftArm")
    
    if pbone_r and pbone_l:
        pbone_r.rotation_mode = 'XYZ'
        pbone_l.rotation_mode = 'XYZ'
        
        # Frame 1: default pose
        bpy.context.scene.frame_set(1)
        pbone_r.rotation_euler = (0, 0, 0)
        pbone_l.rotation_euler = (0, 0, 0)
        pbone_r.keyframe_insert(data_path="rotation_euler", index=-1)
        pbone_l.keyframe_insert(data_path="rotation_euler", index=-1)
        
        # Frame 20: rotate arms
        bpy.context.scene.frame_set(20)
        pbone_r.rotation_euler = (0.5, 0.5, 0)
        pbone_l.rotation_euler = (-0.5, -0.5, 0)
        pbone_r.keyframe_insert(data_path="rotation_euler", index=-1)
        pbone_l.keyframe_insert(data_path="rotation_euler", index=-1)
        
        # Frame 40: back to default pose
        bpy.context.scene.frame_set(40)
        pbone_r.rotation_euler = (0, 0, 0)
        pbone_l.rotation_euler = (0, 0, 0)
        pbone_r.keyframe_insert(data_path="rotation_euler", index=-1)
        pbone_l.keyframe_insert(data_path="rotation_euler", index=-1)
        print("Test animation successfully created.")
    else:
        print("Warning: Arm bones mixamorig:RightArm / mixamorig:LeftArm not found.")
        
    bpy.ops.object.mode_set(mode='OBJECT')

    # Purge orphaned data blocks to clean up meshes and other data from database before export
    bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

    # 7. Export rigged model to GLB (with parent relationship kept)
    output_path = os.path.abspath(args.output)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    print(f"Exporting rigged model to {output_path}...")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_animations=True
    )
    print("Done! Rigged model exported successfully.")

if __name__ == "__main__":
    main()
