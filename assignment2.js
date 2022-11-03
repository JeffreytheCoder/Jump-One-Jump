import { defs, tiny } from './examples/common.js';

const {
  Vector,
  Vector3,
  vec,
  vec3,
  vec4,
  color,
  hex_color,
  Matrix,
  Mat4,
  Light,
  Shape,
  Material,
  Scene,
} = tiny;

function getRandomInt(min, max) {
  return Math.random() * (max - min) + min;
}

class Cube extends Shape {
  constructor() {
    super('position', 'normal');
    // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
    this.arrays.position = Vector3.cast(
      [-1, -1, -1],
      [1, -1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, -1],
      [-1, 1, -1],
      [1, 1, 1],
      [-1, 1, 1],
      [-1, -1, -1],
      [-1, -1, 1],
      [-1, 1, -1],
      [-1, 1, 1],
      [1, -1, 1],
      [1, -1, -1],
      [1, 1, 1],
      [1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [-1, 1, 1],
      [1, 1, 1],
      [1, -1, -1],
      [-1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1]
    );
    this.arrays.normal = Vector3.cast(
      [0, -1, 0],
      [0, -1, 0],
      [0, -1, 0],
      [0, -1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
      [-1, 0, 0],
      [-1, 0, 0],
      [-1, 0, 0],
      [-1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, 1],
      [0, 0, -1],
      [0, 0, -1],
      [0, 0, -1],
      [0, 0, -1]
    );
    // Arrange the vertices into a square shape in texture space too:
    this.indices.push(
      0,
      1,
      2,
      1,
      3,
      2,
      4,
      5,
      6,
      5,
      7,
      6,
      8,
      9,
      10,
      9,
      11,
      10,
      12,
      13,
      14,
      13,
      15,
      14,
      16,
      17,
      18,
      17,
      19,
      18,
      20,
      21,
      22,
      21,
      23,
      22
    );
  }
}

class Base_Scene extends Scene {
  /**
   *  **Base_scene** is a Scene that can be added to any display canvas.
   *  Setup the shapes, materials, camera, and lighting here.
   */
  constructor() {
    // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
    super();

    // shapes
    this.shapes = {
      cube: new Cube(),
    };

    // materials
    this.materials = {
      box: new Material(new defs.Phong_Shader(), {
        ambient: 0.4,
        diffusivity: 0.6,
        color: hex_color('#ffffff'),
      }),
      character: new Material(new defs.Phong_Shader(), {
        ambient: 0,
        diffusivity: 0.8,
        smoothness: 1,
        color: hex_color('#0000FF'),
      }),
    };

    // scene properties
    this.hover = this.swarm = false;
    this.num_boxes = 10; //number of boxes in total
    this.colors = []; //array of colors
    for (let i = 1; i <= this.num_boxes; i++) {
      this.colors.push(color(Math.random(), Math.random(), Math.random(), 1.0));
    }

    // initial camera location
    this.initial_camera_location = Mat4.look_at(
      vec3(0, 20, -15),
      vec3(0, 0, 0),
      vec3(0, -1, 0)
    );
    this.initial_camera_location = this.initial_camera_location.times(
      Mat4.translation(-15, 0, 0)
    );

    //all transformations of rendered boxes
    this.box_transformation_queue = [];
    this.box_interval_queue = [];
    this.max_interval = 12;
    this.min_interval = 8;
    for (let i = 1; i <= this.num_boxes; i++) {
      let temp_interval = getRandomInt(this.min_interval, this.max_interval);
      this.box_interval_queue.push(temp_interval);
    }

    // character property
    this.charging = false;
    //TODO: change later
    this.figure_inital_pos = this.box_interval_queue[0];

    //record charging time for the jump
    this.charging_begin_time = 0;
    this.charging_end_time = 0;
    this.charge_time = 0;
  }

  display(context, program_state) {
    // display():  Called once per frame of animation. Here, the base class's display only does
    // some initial setup.

    // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
    if (!context.scratchpad.controls) {
      this.children.push(
        (context.scratchpad.controls = new defs.Movement_Controls())
      );
      // Define the global camera and projection matrices, which are stored in program_state.
      //program_state.set_camera(Mat4.translation(-5, -5, -30));
      program_state.set_camera(this.initial_camera_location);
    }
    program_state.projection_transform = Mat4.perspective(
      Math.PI / 4,
      context.width / context.height,
      1,
      100
    );

    // *** Lights: *** Values of vector or point lights.
    const light_position = vec4(0, 5, 5, 1);
    program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];
    this.time = program_state.animation_time / 1000;
  }
}

export class Assignment2 extends Base_Scene {
  /**
   * This Scene object can be added to any display canvas.
   * We isolate that code so it can be experimented with on its own.
   * This gives you a very small code sandbox for editing a simple scene, and for
   * experimenting with matrix transformations.
   */

  constructor() {
    super();
  }

  make_control_panel() {
    this.key_triggered_button(
      'Charge for jump',
      ['c'],
      () => {
        this.charging = true;
        this.charging_begin_time = this.time;
      },
      undefined,
      () => {
        this.charging_end_time = this.time;
        this.charging = false;
      }
    );
  }

  draw_box(context, program_state, model_transform, box_index) {
    let translation_distance = this.box_interval_queue[box_index];
    model_transform = model_transform.times(
      Mat4.translation(translation_distance, 0, 0)
    );
    this.shapes.cube.draw(
      context,
      program_state,
      model_transform.times(Mat4.scale(2.5, 2.5, 1)),
      this.materials.box
    );
    return model_transform;
  }

  draw_figure(context, program_state, model_transform, t0, charge_time) {
    // properties
    let local_charge_time = charge_time;
    let t_current = program_state.animation_time / 1000;

    const z_lower_limit = 3;
    const velocity_x_max = 12;
    const velocity_y_max = 6;
    const g = 12;
    const charge_time_max = 1;

    if (local_charge_time > charge_time_max) {
      local_charge_time = charge_time_max;
    }

    // calculate
    let translation_x = 0;
    let translation_y = 0;
    if (local_charge_time != 0) {
      let velocity_x = (velocity_x_max * local_charge_time) / charge_time_max;
      let velocity_y = (velocity_y_max * local_charge_time) / charge_time_max;

      let t_delta = t_current - t0;

      translation_x = t_delta * velocity_x;
      translation_y = t_delta * velocity_y + (1 / 2) * -g * t_delta ** 2;
    }

    // stay still
    if (-translation_y + -z_lower_limit > -z_lower_limit) {
      // has jumped at least once
      if (this.figure_rest_state_transform) {
        this.charge_time = 0;
        this.shapes.cube.draw(
          context,
          program_state,
          this.figure_rest_state_transform.times(Mat4.scale(0.7, 0.7, 2)),
          this.materials.character
        );
        this.figure_start_state_transform = this.figure_rest_state_transform;
      }
    }
    // move along a parabola or stay still
    else {
      // has jumped at least once
      if (this.figure_start_state_transform) {
        model_transform = this.figure_start_state_transform;
        model_transform = model_transform.times(
          Mat4.translation(translation_x, 0, -translation_y)
        );
        this.shapes.cube.draw(
          context,
          program_state,
          model_transform.times(Mat4.scale(0.7, 0.7, 2)),
          this.materials.character
        );
        this.figure_rest_state_transform = model_transform;
      }
      // never jumped yet
      else {
        model_transform = model_transform.times(
          Mat4.translation(this.figure_inital_pos, 0, -3)
        );
        model_transform = model_transform.times(
          Mat4.translation(translation_x, 0, -translation_y)
        );
        this.shapes.cube.draw(
          context,
          program_state,
          model_transform.times(Mat4.scale(0.7, 0.7, 2)),
          this.materials.character
        );
        this.figure_rest_state_transform = model_transform;
      }
    }
    return model_transform;
  }

  display(context, program_state) {
    super.display(context, program_state);
    let model_transform_box = Mat4.identity();
    for (let i = 0; i <= this.num_boxes - 1; i++) {
      model_transform_box = this.draw_box(
        context,
        program_state,
        model_transform_box,
        i
      );
    }
    this.charge_time = 0;
    if (!this.charging) {
      this.charge_time = this.charging_end_time - this.charging_begin_time;
    }
    let model_transform_figure = Mat4.identity();
    model_transform_figure = this.draw_figure(
      context,
      program_state,
      model_transform_figure,
      this.charging_end_time,
      this.charge_time
    );
  }
}
