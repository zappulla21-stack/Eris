"""Regenerate both downloads: blender --background --python scripts/export-model.py"""
import base64
import json
import math
from pathlib import Path
import subprocess
import bpy

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public/assets'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
depth = bpy.data.images.load(str(ASSETS / 'eris-hologram-depth.png'))
depth.colorspace_settings.name = 'Non-Color'
w, h = depth.size
# Blender stores image rows bottom first; the browser samples from the top.
p = list(depth.pixels)
rgba = bytes(round(max(0, min(1, p[(h-1-y)*w*4+x]))*255) for y in range(h) for x in range(w*4))
geometry = json.loads(subprocess.run(['node', str(ROOT/'scripts/export-model.mjs')], input=json.dumps({
    'width': w, 'height': h, 'rgba': base64.b64encode(rgba).decode()
}), text=True, capture_output=True, check=True).stdout)
photo = bpy.data.images.load(str(ASSETS/'eris-hologram-reference.jpeg'))
photo.colorspace_settings.name = 'sRGB'
# Bake the shader's rear remapping and hair transparency to portable textures.
def material(name, image, transparent=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = image
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
    bsdf.inputs['Emission Strength'].default_value = .35
    bsdf.inputs['Roughness'].default_value = .65
    if transparent:
        mat.node_tree.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
        mat.surface_render_method = 'DITHERED'
    image.pack()
    return mat
front_mat = material('Eris - reference', photo)
photo_pixels = list(photo.pixels); pw, ph = photo.size
# Match source(p) in the browser shader, including its top-origin coordinates.
def source(x,y):
    ix=round(max(0,min(1,x))*(pw-1)); iy=round((1-max(0,min(1,y)))*(ph-1))
    return photo_pixels[(iy*pw+ix)*4:(iy*pw+ix)*4+3]
back = bpy.data.images.new('Eris rear circuits',width=w,height=h)
hair = bpy.data.images.new('Eris filaments alpha',width=w,height=h,alpha=True)
back_pixels=[]; hair_pixels=[]
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a))); return t*t*(3-2*t)
for y in range(h):
    v=y/(h-1)
    for x in range(w):
        u=x/(w-1); c=source(.34+u*.32,.805+(1-v)*.175)
        detail=sum(a*b for a,b in zip(c,[.2126,.7152,.0722]))
        back_pixels.extend([c[i]*.45*.45+[.15,.55,.68][i]*detail*.55 for i in range(3)]+[1])
        c=source(u,1-v); i=(y*w+x)*4
        alpha=p[i+1]*smooth(.014,.11,max(c))*(1-p[i+2])
        alpha*=smooth(0,.035,u)*smooth(0,.025,v)*smooth(0,.025,1-v)
        hair_pixels.extend(c+[alpha if alpha>=.01 else 0])
back.pixels=back_pixels; hair.pixels=hair_pixels
back_mat=material('Eris - rear circuits',back)
hair_mat=material('Eris - translucent filaments',hair,True)
for key,name,mats in [('bodyGeometry','Eris bust',[front_mat,back_mat]),('hairGeometry','Eris filaments',[hair_mat])]:
    g=geometry[key]; a=g['positions']; ids=g['indices']; uv=g['uvs']
    # Convert the viewer's Y-up geometry to Blender Z-up; exporters restore Y-up.
    vertices=[(a[i],-a[i+2],a[i+1]) for i in range(0,len(a),3)]
    faces=[ids[i:i+3] for i in range(0,len(ids),3)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new(name,mesh); bpy.context.collection.objects.link(obj)
    for mat in mats: mesh.materials.append(mat)
    layer=mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        poly.use_smooth=True
        if key=='bodyGeometry': poly.material_index=int(sum(g['rear'][i] for i in poly.vertices)/3>.5)
        for loop in poly.loop_indices:
            vi=mesh.loops[loop].vertex_index; layer.data[loop].uv=(uv[vi*2],uv[vi*2+1])
    # A portable breathing loop complements the static baked appearance.
    for frame,z in [(1,0),(41,.004),(81,0),(121,-.004),(161,0)]:
        obj.location.z=z; obj.keyframe_insert(data_path='location',frame=frame,group='Presence')
    obj.select_set(True)
bpy.context.scene.frame_end=161
bpy.context.scene.render.fps=24
bpy.context.scene.frame_set(1)
bpy.ops.export_scene.gltf(filepath=str(ASSETS/'eris-hologram.glb'),export_format='GLB',use_selection=True,export_animations=True)
bpy.ops.export_scene.fbx(filepath=str(ASSETS/'eris-hologram.fbx'),use_selection=True,object_types={'MESH'},path_mode='COPY',embed_textures=True,add_leaf_bones=False,bake_anim=True,bake_anim_use_all_actions=True,axis_forward='-Z',axis_up='Y')
print('Exported Eris GLB and FBX with embedded textures and a presence loop.')
