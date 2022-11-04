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

    // colors
    this.color = hex_color('#CFFFF6');

    // materials
    this.materials = {
      box: new Material(new defs.Phong_Shader(), {
        ambient: 0.4,
        diffusivity: 0.6,
        color: hex_color('#FFF08D'),
      }),
      character: new Material(new defs.Phong_Shader(), {
        ambient: 0.4,
        diffusivity: 0.6,
        color: hex_color('#03A9F4'),
      }),
      floor: new Material(new defs.Phong_Shader(), {
        ambient: 0.4,
        diffusivity: 0,
        smoothness: 1,
        color: this.color,
      }),
    };
    // scene properties
    this.hover = this.swarm = false;
    this.init_num_boxes = 2;
    this.num_boxes = 5; //number of boxes in total
    this.colors = []; //array of colors
    for (let i = 1; i <= this.num_boxes; i++) {
      this.colors.push(color(Math.random(), Math.random(), Math.random(), 1.0));
    }
    this.identity_mat = Mat4.identity();

    // initial camera location
    this.initial_camera_location = Mat4.look_at(
      vec3(0, 20, -15),
      vec3(0, 0, 0),
      vec3(0, -1, 0)
    );
    this.initial_camera_location = this.initial_camera_location.times(
      Mat4.translation(-15, 0, 0)
    );

    // all transformations of rendered boxes
    this.box_translate_queue = [[0, 0]];

    this.max_interval = 10;
    this.min_interval = 5;

    this.box_cur_x = 0;
    this.box_cur_z = 0;

    // figure property
    this.charging = false;
    this.jump_dir = true; // x: true, z: false

    //record charging time for the jump
    this.charging_begin_time = 0;
    this.charging_end_time = 0;
    this.charge_time = 0;

    // current pair of to-be-jumped boxes
    this.first_jump_box = [0, 0];
    this.second_jump_box = 0;

    // figure start state transform
    this.figure_start_state_transform = Mat4.identity().times(Mat4.translation(0, 0, -3).times(Mat4.translation(0, 0, 0)));

    // 
    this.next_dir = true;
  }

  setFloorColor(color) {
    this.materials.floor.color = color;
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
    const light_position = vec4(0, 30, 0, 1);
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
    this.prepare_jump();
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

  prepare_jump() {
    const next_translation = getRandomInt(this.min_interval, this.max_interval);
    console.log(next_translation);
    if (this.box_translate_queue.length === 1) {
      this.next_dir = true;
    } else {
      this.next_dir = Math.round(Math.random());
    }
    if (this.next_dir) {
      this.box_cur_x += next_translation;
      this.box_translate_queue.push([this.box_cur_x, this.box_cur_z]);
      this.jump_dir = true;
    } else {
      this.box_cur_z -= next_translation;
      this.box_translate_queue.push([this.box_cur_x, this.box_cur_z]);
      this.jump_dir = false;
    }
    this.first_jump_box = this.box_translate_queue[this.box_translate_queue.length - 2];
    this.second_jump_box = this.box_translate_queue[this.box_translate_queue.length - 1];
    console.log('asljdkajshdkajhskdjahskdjhaksjhdakjs');
    console.log(this.first_jump_box);
    console.log(this.second_jump_box);
  }

  is_figure_in_next_box() {}

  draw_floor(context, program_state) {
    const floor_mat = this.identity_mat
      .times(Mat4.translation(0, 0, 1))
      .times(Mat4.scale(1000, 1000, 0.001));
    this.shapes.cube.draw(
      context,
      program_state,
      floor_mat,
      this.materials.floor
    );
  }

  draw_box(context, program_state, model_transform, box_index) {
    const [box_x, box_y] = this.box_translate_queue[box_index];

    const box_mat = this.identity_mat
      .times(Mat4.translation(box_x, box_y, 0))
      .times(Mat4.scale(2, 2, 1));
    this.shapes.cube.draw(context, program_state, box_mat, this.materials.box);
    return model_transform;
  }

  areCollided(figure, box) {
    console.log("figure: ");
    console.log(figure);
    console.log("box: ");
    console.log(box);
    if (Math.abs(Math.abs(figure[0]) - Math.abs(box[0])) <= 2.0 && Math.abs(Math.abs(figure[1]) - Math.abs(box[1]) <= 2.0)) {
        return true;
    } return false;
  }

  collideDetect(model_transform) {
    let figure = [model_transform[0][3], model_transform[1][3]];
    if (!this.next_dir) {
      figure = [model_transform[0][3], -model_transform[1][3]];
    }
    console.log(model_transform);
    if (this.areCollided(figure, this.first_jump_box)) {
        console.log("0");
        return 0;
    } else if (this.areCollided(figure, this.second_jump_box)) {
        // console.log("ffffff:");
        // console.log(figure);
        // console.log("ssssss:");
        // console.log(this.second_jump_box);
        console.log("1");
        this.prepare_jump();
        return 1;
    } else {
      console.log("-1");
        return -1;
    }
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
    console.log("y::::");
    console.log(-translation_y);
    console.log("rest translation");
    console.log(this.figure_rest_state_transform);
    // stay still
    if (-translation_y > 0) {
      // has jumped at least once
      // if (this.figure_rest_state_transform) {
        if (this.collideDetect(this.figure_rest_state_transform) === -1) {
          // this.charge_time = 0;
          this.setFloorColor(hex_color('#FF0000'));
          console.log("floor colorlll");
          console.log(this.materials.floor.color);
          this.shapes.cube.draw(
            context,
            program_state,
            this.figure_rest_state_transform.times(Mat4.scale(0.7, 0.7, 2)),
            this.materials.character
          );
          this.figure_start_state_transform = this.figure_rest_state_transform;
          return;
        }
        this.charge_time = 0;
        model_transform = this.figure_rest_state_transform;
        // model_transform = model_transform.times(
        //   Mat4.translation(translation_x, 0, -translation_y)
        // );
        // this.collideDetect(model_transform);
        // this.shapes.cube.draw(
        //   context,
        //   program_state,
        //   model_transform.times(Mat4.scale(0.7, 0.7, 2)),
        //   this.materials.character
        // );
        this.shapes.cube.draw(
          context,
          program_state,
          this.figure_rest_state_transform.times(Mat4.scale(0.7, 0.7, 2)),
          this.materials.character
        );
        // this.figure_rest_state_transform = model_transform;
        this.figure_start_state_transform = model_transform;
      // }
    }
    // move along a parabola or stay still
    else {
      // has jumped at least once
      // if (this.figure_start_state_transform) {
        model_transform = this.figure_start_state_transform;
        if (this.next_dir) {
          model_transform = model_transform.times(
            Mat4.translation(translation_x, 0, -translation_y)
          );
        } else {
          model_transform = model_transform.times(
            Mat4.translation(0, -translation_x, -translation_y)
          );
        }
        
        // this.collideDetect(model_transform);
        this.shapes.cube.draw(
          context,
          program_state,
          model_transform.times(Mat4.scale(0.7, 0.7, 2)),
          this.materials.character
        );
        this.figure_rest_state_transform = model_transform;
      // }
      // never jumped yet
      // else {
      //   model_transform = model_transform.times(Mat4.translation(0, 0, -3));
      //   model_transform = model_transform.times(
      //     Mat4.translation(translation_x, 0, -translation_y)
      //   );
      //   this.shapes.cube.draw(
      //     context,
      //     program_state,
      //     model_transform.times(Mat4.scale(0.7, 0.7, 2)),
      //     this.materials.character
      //   );
      //   this.figure_rest_state_transform = model_transform;
      // }
    }
    return model_transform;
  }

  display(context, program_state) {
    super.display(context, program_state);
    let model_transform_box = Mat4.identity();
    this.draw_floor(context, program_state);

    for (let i = 0; i < this.box_translate_queue.length; i++) {
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
