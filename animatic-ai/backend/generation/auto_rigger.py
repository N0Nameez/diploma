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

def post_process_weights(armature_obj, mesh_obj):
    """
    Clean up incorrect vertex weights to prevent arm bones from pulling the torso,
    cross-talk between left/right sides, and ensure all vertices have some weights.
    """
    print(f"Applying post-skinning weight cleanup and verification on '{mesh_obj.name}'...")
    
    # 1. Bounding box calculations
    min_v = mathutils.Vector((float('inf'), float('inf'), float('inf')))
    max_v = mathutils.Vector((float('-inf'), float('-inf'), float('-inf')))
    for v in mesh_obj.data.vertices:
        co = v.co
        min_v.x = min(min_v.x, co.x)
        min_v.y = min(min_v.y, co.y)
        min_v.z = min(min_v.z, co.z)
        max_v.x = max(max_v.x, co.x)
        max_v.y = max(max_v.y, co.y)
        max_v.z = max(max_v.z, co.z)
        
    size = max_v - min_v
    center = (min_v + max_v) / 2.0
    print(f"  Mesh bounds: size={size}, center={center}")
    
    # Define bone names
    right_arm_bones = {
        "mixamorig:RightArm", "mixamorig:RightForeArm", "mixamorig:RightHand",
        "mixamorig:RightHandThumb1", "mixamorig:RightHandThumb2", "mixamorig:RightHandThumb3", "mixamorig:RightHandThumb4",
        "mixamorig:RightHandIndex1", "mixamorig:RightHandIndex2", "mixamorig:RightHandIndex3", "mixamorig:RightHandIndex4",
        "mixamorig:RightHandMiddle1", "mixamorig:RightHandMiddle2", "mixamorig:RightHandMiddle3", "mixamorig:RightHandMiddle4",
        "mixamorig:RightHandRing1", "mixamorig:RightHandRing2", "mixamorig:RightHandRing3", "mixamorig:RightHandRing4",
        "mixamorig:RightHandPinky1", "mixamorig:RightHandPinky2", "mixamorig:RightHandPinky3", "mixamorig:RightHandPinky4"
    }
    
    left_arm_bones = {
        "mixamorig:LeftArm", "mixamorig:LeftForeArm", "mixamorig:LeftHand",
        "mixamorig:LeftHandThumb1", "mixamorig:LeftHandThumb2", "mixamorig:LeftHandThumb3", "mixamorig:LeftHandThumb4",
        "mixamorig:LeftHandIndex1", "mixamorig:LeftHandIndex2", "mixamorig:LeftHandIndex3", "mixamorig:LeftHandIndex4",
        "mixamorig:LeftHandMiddle1", "mixamorig:LeftHandMiddle2", "mixamorig:LeftHandMiddle3", "mixamorig:LeftHandMiddle4",
        "mixamorig:LeftHandRing1", "mixamorig:LeftHandRing2", "mixamorig:LeftHandRing3", "mixamorig:LeftHandRing4",
        "mixamorig:LeftHandPinky1", "mixamorig:LeftHandPinky2", "mixamorig:LeftHandPinky3", "mixamorig:LeftHandPinky4"
    }
    
    name_to_vg = {vg.name: vg for vg in mesh_obj.vertex_groups}
    
    left_vgs = [name_to_vg[name] for name in left_arm_bones if name in name_to_vg]
    right_vgs = [name_to_vg[name] for name in right_arm_bones if name in name_to_vg]
    all_arm_vgs = left_vgs + right_vgs
    
    # 2. Prune weights
    # We prune:
    # - Left arm bones from vertices on the right side (X < center.x - 0.015)
    # - Right arm bones from vertices on the left side (X > center.x + 0.015)
    # - All arm bones from central torso vertices (|X - center.x| < 0.12 * size.x) below shoulder level (Z < min_v.z + 0.85 * size.z)
    torso_x_limit = 0.12 * size.x
    pruned_count = 0
    
    for v in mesh_obj.data.vertices:
        co = v.co
        
        # Left arm bones on the right side
        if co.x < center.x - 0.015:
            for vg in left_vgs:
                vg.remove([v.index])
                pruned_count += 1
                
        # Right arm bones on the left side
        if co.x > center.x + 0.015:
            for vg in right_vgs:
                vg.remove([v.index])
                pruned_count += 1
                
        # Central torso cleanup
        if abs(co.x - center.x) < torso_x_limit:
            if co.z < min_v.z + 0.85 * size.z:
                for vg in all_arm_vgs:
                    vg.remove([v.index])
                    pruned_count += 1
                    
    print(f"  Pruned {pruned_count} incorrect arm bone weights from the torso and opposite side.")
    
    # 3. Ensure all vertices have at least some weights, otherwise bind to Hips
    default_bone_name = "mixamorig:Hips"
    hips_vg = name_to_vg.get(default_bone_name)
    if not hips_vg:
        hips_vg = mesh_obj.vertex_groups.new(name=default_bone_name)
        
    fixed_unweighted = 0
    for v in mesh_obj.data.vertices:
        total_weight = sum(g.weight for g in v.groups)
        if total_weight < 0.001:
            hips_vg.add([v.index], 1.0, 'REPLACE')
            fixed_unweighted += 1
            
    if fixed_unweighted > 0:
        print(f"  Assigned {fixed_unweighted} unweighted/pruned vertices to '{default_bone_name}'.")

def bind_armature_with_fallback(armature_obj, model_meshes):
    """
    Attempt to bind the mesh to the armature. If automatic weight generation fails,
    uses a voxel remesh copy to generate auto weights and transfers them to the original mesh.
    """
    for mesh_obj in model_meshes:
        # Deselect all and select the mesh and armature
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        armature_obj.select_set(True)
        bpy.context.view_layer.objects.active = armature_obj
        
        print(f"Attempting automatic skinning for '{mesh_obj.name}'...")
        try:
            bpy.ops.object.parent_set(type='ARMATURE_AUTO')
            print(f"Skinning with AUTOMATIC_WEIGHTS completed successfully for '{mesh_obj.name}'!")
        except Exception as e:
            print(f"WARNING: Automatic skinning failed for '{mesh_obj.name}': {e}")
            print("Initiating Voxel Remesh + Data Transfer weight transfer fallback...")
            
            # Clean up mesh_obj from failed ARMATURE_AUTO before fallback operations
            mesh_obj.parent = None
            for mod in list(mesh_obj.modifiers):
                if mod.type == 'ARMATURE':
                    mesh_obj.modifiers.remove(mod)
            mesh_obj.vertex_groups.clear()
            
            try:
                # 1. Duplicate the mesh object to make a proxy
                bpy.ops.object.select_all(action='DESELECT')
                mesh_obj.select_set(True)
                bpy.context.view_layer.objects.active = mesh_obj
                bpy.ops.object.duplicate()
                proxy_obj = bpy.context.view_layer.objects.active
                proxy_obj.name = f"{mesh_obj.name}_proxy_remap"
                
                # Make sure proxy has no armature modifiers or parent relationship first
                proxy_obj.parent = None
                for mod in list(proxy_obj.modifiers):
                    proxy_obj.modifiers.remove(mod)
                # Clear existing vertex groups on proxy
                proxy_obj.vertex_groups.clear()
                
                # 2. Apply Voxel Remesh modifier to proxy to clean up geometry
                remesh_mod = proxy_obj.modifiers.new(name="VoxelRemesh", type='REMESH')
                remesh_mod.mode = 'VOXEL'
                remesh_mod.voxel_size = 0.025
                remesh_mod.use_smooth_shade = True
                
                # Apply modifier
                bpy.ops.object.select_all(action='DESELECT')
                proxy_obj.select_set(True)
                bpy.context.view_layer.objects.active = proxy_obj
                bpy.ops.object.modifier_apply(modifier=remesh_mod.name)
                
                # 3. Parent the proxy to the armature with auto weights
                bpy.ops.object.select_all(action='DESELECT')
                proxy_obj.select_set(True)
                armature_obj.select_set(True)
                bpy.context.view_layer.objects.active = armature_obj
                bpy.ops.object.parent_set(type='ARMATURE_AUTO')
                print("Successfully auto-weighted the proxy mesh.")
                
                # 4. Use Data Transfer on the original mesh to copy vertex group weights from proxy
                # First, ensure original mesh is parented to armature with empty groups so it has the vertex groups
                bpy.ops.object.select_all(action='DESELECT')
                mesh_obj.select_set(True)
                armature_obj.select_set(True)
                bpy.context.view_layer.objects.active = armature_obj
                bpy.ops.object.parent_set(type='ARMATURE_NONE') # This creates the vertex groups matching bones, and armature modifier
                
                # Setup Data Transfer modifier on original mesh
                bpy.ops.object.select_all(action='DESELECT')
                mesh_obj.select_set(True)
                bpy.context.view_layer.objects.active = mesh_obj
                
                dt_mod = mesh_obj.modifiers.new(name="WeightTransfer", type='DATA_TRANSFER')
                dt_mod.object = proxy_obj
                dt_mod.use_vert_data = True
                dt_mod.data_types_verts = {'VGROUP_WEIGHTS'}
                dt_mod.vert_mapping = 'NEAREST'
                
                # Apply the data transfer
                bpy.ops.object.data_transfer_layout_map(modifier=dt_mod.name)
                bpy.ops.object.modifier_apply(modifier=dt_mod.name)
                print("Weights transferred successfully to original mesh via Data Transfer.")
                
                # 5. Clean up the proxy object
                bpy.ops.object.select_all(action='DESELECT')
                proxy_obj.select_set(True)
                bpy.context.view_layer.objects.active = proxy_obj
                # Unparent proxy
                proxy_obj.parent = None
                bpy.data.objects.remove(proxy_obj, do_unlink=True)
                
                # 6. Ensure original mesh is parented to armature and has Armature modifier
                bpy.ops.object.select_all(action='DESELECT')
                mesh_obj.select_set(True)
                armature_obj.select_set(True)
                bpy.context.view_layer.objects.active = armature_obj
                
                # Keep only the first Armature modifier, remove any duplicates
                arm_mods = [m for m in mesh_obj.modifiers if m.type == 'ARMATURE']
                if len(arm_mods) > 1:
                    print(f"Removing {len(arm_mods) - 1} duplicate Armature modifiers...")
                    for extra_mod in arm_mods[1:]:
                        mesh_obj.modifiers.remove(extra_mod)
                
                arm_mod = arm_mods[0] if arm_mods else mesh_obj.modifiers.new(name="Armature", type='ARMATURE')
                arm_mod.object = armature_obj
                
                print("Proxy-based fallback skinning completed successfully!")
            except Exception as inner_e:
                print(f"ERROR: Fallback skinning failed: {inner_e}")
                # Ultimate fallback: envelope weights or empty groups
                print("Falling back to ARMATURE_ENVELOPE...")
                try:
                    bpy.ops.object.select_all(action='DESELECT')
                    mesh_obj.select_set(True)
                    armature_obj.select_set(True)
                    bpy.context.view_layer.objects.active = armature_obj
                    bpy.ops.object.parent_set(type='ARMATURE_ENVELOPE')
                except Exception as e_env:
                    print(f"ERROR: Envelope fallback failed: {e_env}")
                    print("Falling back to ARMATURE_NONE...")
                    bpy.ops.object.select_all(action='DESELECT')
                    mesh_obj.select_set(True)
                    armature_obj.select_set(True)
                    bpy.context.view_layer.objects.active = armature_obj
                    bpy.ops.object.parent_set(type='ARMATURE_NONE')
        
        # Post-process weights to prevent torso stretching and side cross-talk
        post_process_weights(armature_obj, mesh_obj)

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
        
    # Delete pre-existing Armatures and their animations/data before skeleton import
    import_armatures = [obj for obj in bpy.data.objects if obj.type == 'ARMATURE']
    for arm_obj in import_armatures:
        print(f"Deleting imported armature object: '{arm_obj.name}'...")
        bpy.data.objects.remove(arm_obj, do_unlink=True)
        
    # Delete armature data blocks to avoid orphans
    for arm_data in list(bpy.data.armatures):
        print(f"Deleting armature data: '{arm_data.name}'...")
        bpy.data.armatures.remove(arm_data)
        
    # Delete any action (animations) from the imported file
    for action in list(bpy.data.actions):
        print(f"Deleting imported action/animation: '{action.name}'...")
        bpy.data.actions.remove(action)
        
    # Unparent meshes and apply transforms to model meshes immediately
    print("Unparenting meshes, cleaning vertex groups/modifiers, and applying transformations to model meshes...")
    for mesh_obj in model_meshes:
        bpy.ops.object.select_all(action='DESELECT')
        mesh_obj.select_set(True)
        bpy.context.view_layer.objects.active = mesh_obj
        # Clear parent and keep world transformation
        if mesh_obj.parent:
            print(f"Clearing parent '{mesh_obj.parent.name}' for '{mesh_obj.name}'...")
            bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
            
        # Remove any pre-existing Armature modifiers
        for mod in list(mesh_obj.modifiers):
            if mod.type == 'ARMATURE':
                print(f"Removing pre-existing Armature modifier '{mod.name}' from '{mesh_obj.name}'...")
                mesh_obj.modifiers.remove(mod)
                
        # Clear all existing vertex groups
        print(f"Clearing pre-existing vertex groups from '{mesh_obj.name}'...")
        mesh_obj.vertex_groups.clear()
        
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
                
        # Delete noise meshes in one batch
        if to_delete:
            bpy.ops.object.select_all(action='DESELECT')
            for mesh in to_delete:
                mesh.select_set(True)
            bpy.ops.object.delete()
            
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
        
    # Clear imported animation data/actions from the armature first
    if armature_obj.animation_data:
        print("Clearing imported skeleton animation data...")
        armature_obj.animation_data.action = None
        armature_obj.animation_data.clear()
        
    # Delete any new actions (animations) imported with the skeleton
    for action in list(bpy.data.actions):
        print(f"Deleting skeleton imported action/animation: '{action.name}'...")
        bpy.data.actions.remove(action)
        
    # Reset pose transforms immediately to ensure we apply transformations to the Rest Pose
    print("Resetting skeleton pose transforms to Rest Pose before applying transformations...")
    bpy.ops.object.mode_set(mode='POSE')
    for pbone in armature_obj.pose.bones:
        pbone.location = (0, 0, 0)
        pbone.rotation_quaternion = (1, 0, 0, 0)
        pbone.rotation_axis_angle = (0, 0, 1, 0)
        pbone.rotation_euler = (0, 0, 0)
        pbone.scale = (1, 1, 1)
    bpy.ops.object.mode_set(mode='OBJECT')
        
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
        
    # Apply transforms to skeleton immediately after import (now in rest pose)
    print("Applying transformations to base skeleton...")
    bpy.ops.object.select_all(action='DESELECT')
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
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
    print("Performing skinning with fallback mechanism...")
    bind_armature_with_fallback(armature_obj, model_meshes)
            
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

    # Ensure meshes remain parented to armature for proper nested glTF export

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
