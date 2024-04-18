import bpy
import os
import bmesh
import mathutils
from math import radians


class TOOL_OT_3dp_rename(bpy.types.Operator):
    bl_idname = "3dp.rename"
    bl_label = "rename"
    bl_description = "set name of object data"
    bl_options = {"REGISTER", "UNDO"}
    foo: bpy.props.StringProperty(name="Name")

    def execute(self, context):
        obj = context.active_object
        obj.name = self.foo
        obj.data.name = self.foo

        return {"FINISHED"}


class TOOL_OT_3dp_initialize(bpy.types.Operator):
    bl_idname = "3dp.init"
    bl_label = "init"
    bl_description = "transform, rotate and separate loose parts"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        return context.active_object.mode == "OBJECT"

    def execute(self, context):

        obj = context.active_object

        obj.scale = (0.01, 0.01, 0.01)
        obj.rotation_euler = mathutils.Euler((0.0, 0.0, 0.0), "XYZ")

        verts = [vert.co for vert in obj.data.vertices]
        plain_verts = [list(vert.to_tuple()) for vert in verts]

        height = 0
        for x in plain_verts:
            vert = round(x[2], 6)
            if vert < height:
                height = vert

        obj.location = (0.0, 0.0, abs(height) / 100)
        bpy.ops.object.transform_apply(location=True, scale=True, rotation=True)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.separate(type="LOOSE")
        bpy.ops.object.mode_set(mode="OBJECT")

        return {"FINISHED"}


class TOOL_OT_3dp_dissolve(bpy.types.Operator):
    bl_idname = "3dp.ld"
    bl_label = "limited dissolve"
    bl_description = "limited dissolve mesh"
    bl_options = {"REGISTER", "UNDO"}
    foo: bpy.props.FloatProperty(name="Radius")

    @classmethod
    def poll(cls, context):
        return context.active_object.mode == "OBJECT"

    def execute(self, context):
        meshes = set(o.data for o in context.selected_objects if o.type == "MESH")

        bm = bmesh.new()

        for m in meshes:
            bm.from_mesh(m)
            bmesh.ops.dissolve_limit(
                bm, angle_limit=radians(self.foo), verts=bm.verts, edges=bm.edges
            )
            bm.to_mesh(m)
            m.update()
            bm.clear()

        bm.free()

        return {"FINISHED"}


class TOOL_OT_3dp_unwrap(bpy.types.Operator):
    bl_idname = "3dp.unwrap"
    bl_label = "unwrap uv"
    bl_description = "project uv from view"
    bl_options = {"REGISTER", "UNDO"}
    foo: bpy.props.StringProperty(name="Direction")

    @classmethod
    def poll(cls, context):
        return context.active_object.mode == "EDIT"

    def execute(self, context):
        camera_data = bpy.data.cameras.get("3DPCamera")

        if camera_data is None:
            camera_data = bpy.data.cameras.new(name="3DPCamera")
            my_camera = bpy.data.objects.new("3DPCamera", camera_data)

            context.scene.collection.objects.link(my_camera)
        else:
            my_camera = bpy.data.objects["3DPCamera"]

        if context.active_object.mode != "EDIT":
            self.report({"ERROR"}, "Not in Edit Mode")
            return {"CANCELLED"}

        if context.active_object.data.total_face_sel == 0:
            self.report({"ERROR"}, "No Faces Selected")
            return {"CANCELLED"}

        camera_data.type = "ORTHO"

        cam_rot = mathutils.Euler((radians(90), 0.0, radians(-90)), "XYZ")
        cam_loc = (-9.4902, 0.0000, 0.0000)
        camera_data.ortho_scale = 2

        if self.foo == "top":
            cam_rot = mathutils.Euler((radians(6), 0.0, 0.0), "XYZ")
            cam_loc = (0.000, 0.6666, 5.0786)
            camera_data.ortho_scale = 5
        if self.foo == "bottom":
            cam_rot = mathutils.Euler((radians(180), 0.0, 0.0), "XYZ")
            cam_loc = (0.0000, -1.1414, -6.0376)
            camera_data.ortho_scale = 5

        my_camera.location = cam_loc
        my_camera.rotation_euler = cam_rot
        context.scene.camera = my_camera

        bpy.ops.view3d.view_camera()

        for area in bpy.context.screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.update()

        bpy.ops.uv.project_from_view(
            camera_bounds=True, correct_aspect=False, scale_to_bounds=False
        )

        bpy.ops.view3d.view_camera()

        return {"FINISHED"}


class TOOL_OT_3dp_export(bpy.types.Operator):
    bl_idname = "3dp.export"
    bl_label = "xxport gltf"
    foo: bpy.props.StringProperty(name="Direction")
    filename_ext = ".glb"

    @classmethod
    def poll(cls, context):
        return len(context.selected_objects) > 0

    def execute(self, context):
        print(self, context.selected_objects)
        print(context.scene.my_path)
        print(os.path)
        bpy.ops.export_scene.gltf(
            filepath=bpy.path.abspath(context.scene.my_path),
            use_selection=True,
            export_materials="PLACEHOLDER",
            export_animations=False,
            export_morph=False,
        )
        return {"FINISHED"}


class VIEW3D_PT_3dpkbd_uv_panel(bpy.types.Panel):
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"

    bl_category = "3DPKBD Tool"
    bl_label = "3DPKBD Tool"

    def draw(self, context):
        layout = self.layout
        row = layout.row()
        row.operator("3dp.init", text="Initialize Model")
        #
        box = layout.box()
        box.label(text="Limited Dissolve")
        col = box.column(align=True)
        row = col.row()
        row.operator("3dp.ld", text="2°").foo = 2
        row.operator("3dp.ld", text="5°").foo = 5
        #
        box = layout.box()
        box.label(text="UV Project from View")
        col = box.column(align=True)
        row = col.row()
        row.operator("3dp.unwrap", text="Side UV").foo = "side"
        row.operator("3dp.unwrap", text="Top UV").foo = "top"
        row.operator("3dp.unwrap", text="Bottom UV").foo = "bottom"
        #
        box = layout.box()
        box.label(text="Rename")
        col = box.column(align=True)
        row = col.row()
        row.operator("3dp.rename", text="Top").foo = "top"
        row.operator("3dp.rename", text="Standard").foo = "standard"
        row.operator("3dp.rename", text="Vented").foo = "vented"
        col.separator()
        row = col.row()
        row.operator("3dp.rename", text="Blocker").foo = "blocker"
        row.operator("3dp.rename", text="Blocker-1").foo = "blocker-1"
        row.operator("3dp.rename", text="Blocker-2").foo = "blocker-2"
        #
        box = layout.box()
        box.label(text="Export")
        col = box.column(align=True)
        col.prop(context.scene, "my_path", text="")
        col.separator()
        row = col.row()
        row.operator("3dp.export", text="Export GLTF").foo = "side"


def register():
    bpy.utils.register_class(TOOL_OT_3dp_initialize)
    bpy.utils.register_class(TOOL_OT_3dp_dissolve)
    bpy.utils.register_class(TOOL_OT_3dp_unwrap)
    bpy.utils.register_class(TOOL_OT_3dp_rename)
    bpy.utils.register_class(TOOL_OT_3dp_export)
    bpy.utils.register_class(VIEW3D_PT_3dpkbd_uv_panel)
    bpy.types.Scene.my_path = bpy.props.StringProperty(name="File", subtype="FILE_PATH")


def unregister():
    bpy.utils.unregister_class(TOOL_OT_3dp_initialize)
    bpy.utils.unregister_class(TOOL_OT_3dp_dissolve)
    bpy.utils.unregister_class(TOOL_OT_3dp_unwrap)
    bpy.utils.unregister_class(TOOL_OT_3dp_rename)
    bpy.utils.unregister_class(TOOL_OT_3dp_export)
    bpy.utils.unregister_class(VIEW3D_PT_3dpkbd_uv_panel)
    del bpy.types.Scene.my_path


if __name__ == "__main__":
    register()
