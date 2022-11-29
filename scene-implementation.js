import { defs, tiny } from './examples/common.js';
import Shape_From_File from  './examples/obj-file-demo.js';

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
  Texture,
} = tiny;

const LANDED_ON_GROUND = 10;
const LANDED_ON_EDGE = 11;
const LANDED_ON_BOX = 12;
const LANDED_ON_EDGE_BOX1 = 13;
const LANDED_ON_EDGE_BOX2 = 14;
const DIRECT_FALLING = 20;
const ROTATE_AND_FALLING = 21;

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

    //4 lines below: Code adapted from ./examples/surfaces-demo.js
    const initial_corner_point = vec3(-1, -1, 0);
    const row_operation = (s, p) =>
      p
        ? Mat4.translation(0, 0.2, 0).times(p.to4(1)).to3()
        : initial_corner_point;
    const column_operation = (t, p) =>
      Mat4.translation(0.2, 0, 0).times(p.to4(1)).to3();

    let modified_floor = new defs.Grid_Patch(
      10,
      10,
      row_operation,
      column_operation
    );
    for (let i = 0; i < modified_floor.arrays.texture_coord.length; i++) {
      modified_floor.arrays.texture_coord[i].scale_by(1);
    }

    let modified_cube = new defs.Cube();
    for (let i = 0; i < modified_cube.arrays.texture_coord.length; i++) {
      modified_cube.arrays.texture_coord[i].scale_by(0.5);
    }

    // shapes
    this.shapes = {
      cube: modified_cube,
      //chess: new Cube(),
      sheet: modified_floor,
      chess: new Shape_From_File("assets/Chess.obj")
    };

    // colors
    this.color = hex_color('#F7342B');

    // materials
    this.materials = {
      box: new Material(new defs.Textured_Phong(), {
        ambient: 1,
        color: hex_color('#000000'),
        texture: new Texture('assets/steel2.jpg'),
      }),
      character: new Material(new defs.Textured_Phong(), {
        ambient: 0.4,
        color: hex_color('#000000'),
        texture: new Texture('assets/wood.jpg'),
      }),
      floor: new Material(new defs.Textured_Phong(), {
        ambient: 1,
        color: hex_color('#000000'),
        texture: new Texture('assets/lava.jpg'),
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

    // initial camera & light location
    this.initial_camera_location = Mat4.look_at(
      vec3(-20, 20, -20),
      vec3(1, -1, 1),
      vec3(1, -1, 0)
    );
    this.initial_camera_location = this.initial_camera_location.times(
      Mat4.translation(-5, 0, 0)
    );
    this.light_pos = vec4(-5, 200, -200, 1);

    // all transformations of rendered boxes
    this.box_translate_queue = [[0, 0]];

    this.max_interval = 12.5;
    this.min_interval = 8;

    this.box_cur_x = 0;
    this.box_cur_z = 0;

    // figure property
    this.charging = false;
    this.jump_dir = true; // x: true, z: false

    // record charging time for the jump
    this.charging_begin_time = 0;
    this.charging_end_time = 0;
    this.charge_time = 0;
    this.charging_scale = 2;
    this.jump_distance = 0;

    // current pair of to-be-jumped boxes
    this.first_jump_box = [0, 0];
    this.second_jump_box = 0;

    // figure start state transform
    this.figure_start_state_transform = Mat4.identity().times(
      Mat4.translation(0, 0, 0)
    );
    this.figure_rest_state_transform = Mat4.identity();
    //x: true, z: false
    this.next_dir = true;

    //game over sign
    this.game_over_1 = false;
    this.game_over_2 = false;
    this.game_over_3 = false;
    this.fall_dis = 1.5;

    // score
    this.score = -1;

    //for camera translation
    this.camera_horizontal_translation = 0;
    this.camera_depth_translation = 0;

    //for rotation when falling
    this.falling_rotation = 0;
    this.axis_offset = 0;
    this.last_RF_transform = Mat4.identity();
    this.fall_dis_2 = 0;
    this.near_edge = false;
    this.mouse_enabled = false;
    this.r = Mat4.identity();
  }

  setFloorColor(color) {
    this.materials.floor.color = color;
  }

  //floating_floor: Code adapted from ./examples/surfaces-demo.js
  floating_floor(context, program_state) {
    const random = (x) =>
      Math.sin(1000 * x + program_state.animation_time / 1000);

    // Update the JavaScript-side shape with new vertices:
    this.shapes.sheet.arrays.position.forEach(
      (p, i, a) => (a[i] = vec3(p[0], p[1], 0.15 * random(i / a.length)))
    );
    // Update the normals to reflect the surface's new arrangement.
    // This won't be perfect flat shading because vertices are shared.
    //this.shapes.sheet.flat_shade();
    // Draw the current sheet shape.
    let floor_transform = Mat4.identity();
    floor_transform = floor_transform.times(Mat4.scale(1000, 1000, 4));
    floor_transform = floor_transform.times(Mat4.translation(0.15, 0.05, 0));
    this.shapes.sheet.draw(
      context,
      program_state,
      floor_transform,
      this.materials.floor
    );

    // Update the gpu-side shape with new vertices.
    // Warning:  You can't call this until you've already drawn the shape once.
    this.shapes.sheet.copy_onto_graphics_card(
      context.context,
      ['position', 'normal'],
      false
    );
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
      program_state.lights = [
        new Light(this.light_pos, color(1, 1, 1, 1), 80000),
      ];
    }
    program_state.projection_transform = Mat4.perspective(
      Math.PI / 4,
      context.width / context.height,
      1,
      100
    );

    // *** Lights: *** Values of vector or point lights.
    this.time = program_state.animation_time / 1000;
  }
}

export class SceneImplementation extends Base_Scene {
  /**
   * This Scene object can be added to any display canvas.
   * We isolate that code so it can be experimented with on its own.
   * This gives you a very small code sandbox for editing a simple scene, and for
   * experimenting with matrix transformations.
   */

  constructor() {
    super();
    this.play_list = ['1', '2'];
    this.current_song_index = 0;
    this.charge_audio = new Audio('./music/charge.mp3');
    this.end_audio = new Audio('./music/end.mp3');
    this.end_audio.loop = false;
    this.audio = new Audio('./music/something_nice1.mp3');
    this.audio_play_start = false;
    this.setUpAudio();
    this.prepare_jump();
    //this.play_music_list();
  }

  setUpAudio() {
    let self = this;
    this.audio.onended = function () {
      self.updateAudio(self);
    };
  }

  updateAudio(self) {
    console.log('onended');
    console.log(self.current_song_index);
    self.current_song_index =
      (self.current_song_index + 1) % self.play_list.length;
    self.audio.src =
      './music/something_nice' +
      self.play_list[self.current_song_index] +
      '.mp3';
    self.audio.load();
    self.audio.play();
  }

  play_music_list() {
    if (!this.audio_play_start) {
      this.audio.play();
    }
  }
  make_control_panel() {
    this.key_triggered_button(
      'Charge for jump',
      ['c'],
      () => {
        this.charging = true;
        this.charge_audio.play();
        this.charging_begin_time = this.time;
      },
      undefined,
      () => {
        this.charge_audio.pause();
        this.charge_audio.currentTime = 0;
        this.charging_end_time = this.time;
        if (!this.game_over_1 && !this.game_over_2) {
          this.charging = false;
        }
      }
    );
  }

  add_mouse_controls(canvas) {
    canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.charging = true;
      this.charge_audio.play();
      this.charging_begin_time = this.time;
    });
    canvas.addEventListener('mouseup', (e) => {
      this.charge_audio.pause();
      this.charge_audio.currentTime = 0;
      this.charging_end_time = this.time;
      if (!this.game_over_1 && !this.game_over_2) {
        this.charging = false;
      }
    });
  }

  //prepares the next landing box
  prepare_jump() {
    this.score += 1;
    document.getElementById('score').innerHTML = this.score;
    const next_translation = getRandomInt(this.min_interval, this.max_interval);
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
    this.first_jump_box =
      this.box_translate_queue[this.box_translate_queue.length - 2];
    this.second_jump_box =
      this.box_translate_queue[this.box_translate_queue.length - 1];
  }

  is_figure_in_next_box() {}

  // draw_floor(context, program_state) {
  //   const floor_mat = this.identity_mat
  //     .times(Mat4.translation(0, 0, 1))
  //     .times(Mat4.scale(1000, 1000, 0.001));
  //   this.shapes.cube.draw(
  //     context,
  //     program_state,
  //     floor_mat,
  //     this.materials.floor
  //   );
  // }

  draw_box(context, program_state, model_transform, box_index) {
    const [box_x, box_y] = this.box_translate_queue[box_index];

    const box_mat = this.identity_mat.times(
      Mat4.translation(box_x, box_y, 0).times(Mat4.scale(2, 2, 1.5))
    );
    this.shapes.cube.draw(context, program_state, box_mat, this.materials.box);
    return model_transform;
  }

  areCollided(figure, box) {
    const threshold = 3;
    if (
      Math.abs(Math.abs(figure[0]) - Math.abs(box[0])) >= threshold ||
      Math.abs(Math.abs(figure[1]) - Math.abs(box[1])) >= threshold
    ) {
      return LANDED_ON_GROUND;
    } else if (
      Math.abs(Math.abs(figure[0]) - Math.abs(box[0])) < threshold &&
      Math.abs(Math.abs(figure[0]) - Math.abs(box[0])) > 2
    ) {
      this.axis_offset = Math.abs(Math.abs(figure[0]) - Math.abs(box[0])) - 2;
      this.near_edge = figure[0] > box[0] ? false : true;
      //console.log("figure[0]: %d, box[0]: %d", figure[0], box[0])
      return LANDED_ON_EDGE;
    } else if (
      Math.abs(Math.abs(figure[1]) - Math.abs(box[1])) < threshold &&
      Math.abs(Math.abs(figure[1]) - Math.abs(box[1])) > 2
    ) {
      this.axis_offset = Math.abs(Math.abs(figure[1]) - Math.abs(box[1])) - 2;
      this.near_edge = figure[1] < box[1] ? false : true;
      //console.log("figure[1]: %d, box[1]: %d", figure[1], box[1])
      return LANDED_ON_EDGE;
    } else {
      return LANDED_ON_BOX;
    }
  }

  collideDetect(model_transform) {
    let figure = [model_transform[0][3], model_transform[1][3]];
    // if (!this.next_dir) {
    //   figure = [model_transform[0][3], -model_transform[1][3]];
    // }
    let first_box_result = this.areCollided(figure, this.first_jump_box);
    let second_box_result = this.areCollided(figure, this.second_jump_box);
    if (first_box_result === LANDED_ON_BOX) {
      return 0;
    } else if (second_box_result === LANDED_ON_BOX) {
      this.prepare_jump();
      return 1;
    } else if (
      first_box_result === LANDED_ON_GROUND &&
      second_box_result === LANDED_ON_GROUND
    ) {
      return LANDED_ON_GROUND;
    } else if (first_box_result === LANDED_ON_EDGE) {
      return LANDED_ON_EDGE_BOX1;
    } else if (second_box_result === LANDED_ON_EDGE) {
      return LANDED_ON_EDGE_BOX2;
    } else {
      return -1;
    }
  }

  getXYTranslations(t0, charge_time, program_state) {
    let local_charge_time = charge_time;
    const t_current = program_state.animation_time / 1000;
    const velocity_x_max = 12;
    const velocity_y_max = 10;
    const g = 12;
    const charge_time_max = 1;
    if (local_charge_time > charge_time_max) {
      local_charge_time = charge_time_max;
    }
    // calculate
    let velocity_x = 0;
    let velocity_y = 0;
    let translation_x = 0;
    let translation_y = 0;
    if (local_charge_time != 0) {
      velocity_x = (velocity_x_max * local_charge_time) / charge_time_max;
      velocity_y = (velocity_y_max * local_charge_time) / charge_time_max;
      let t_delta = t_current - t0;
      translation_x = t_delta * velocity_x;
      translation_y = t_delta * velocity_y + (1 / 2) * -g * t_delta ** 2;
    }
    this.jump_distance = velocity_x * ((2 * velocity_y) / g);
    return [translation_x, translation_y];
  }

  doGameOver() {
    this.end_audio.play();
    this.setFloorColor(hex_color('#FF0000'));
    this.figure_start_state_transform = this.figure_rest_state_transform;
    if (!this.audio.paused) {
      this.audio.pause();
    }
    console.log(window.localStorage.getItem('highest'));
    if (window.localStorage.getItem('highest') < this.score) {
      window.localStorage.setItem('highest', this.score);
      const restartModal = document.getElementById('congratulation');
      restartModal.style.display = 'block';
    } else {
      const restartModal = document.getElementById('restart');
      restartModal.style.display = 'block';
    }
  }

  checkGameOver() {
    if (this.game_over_1) {
      return [DIRECT_FALLING, 0];
    } else if (this.game_over_2) {
      return [ROTATE_AND_FALLING, LANDED_ON_EDGE_BOX1];
    } else if (this.game_over_3) {
      return [ROTATE_AND_FALLING, LANDED_ON_EDGE_BOX2];
    }
    let collide_detect_result = this.collideDetect(
      this.figure_rest_state_transform
    );
    if (collide_detect_result === LANDED_ON_GROUND) {
      this.game_over_1 = true;
      this.doGameOver();
      return [DIRECT_FALLING, 0];
    } else if (collide_detect_result === LANDED_ON_EDGE_BOX1) {
      this.game_over_2 = true;
      this.doGameOver();
      return [ROTATE_AND_FALLING, LANDED_ON_EDGE_BOX1];
    } else if (collide_detect_result === LANDED_ON_EDGE_BOX2) {
      this.game_over_3 = true;
      this.doGameOver();
      return [ROTATE_AND_FALLING, LANDED_ON_EDGE_BOX2];
    }
    return [0, 0];
  }

  resetTimers() {
    this.charge_time = 0;
    this.charging_end_time = 0;
    this.charging_begin_time = 0;
  }

  resetCameraTranslations() {
    this.camera_horizontal_translation = 0;
    this.camera_depth_translation = 0;
  }

  changeInitCameraLoc() {
    const [x_cam_hor_tran, y_cam_hor_tran] = this.last_dir
      ? [-this.camera_horizontal_translation, 0]
      : [0, -this.camera_depth_translation];
    this.initial_camera_location = this.initial_camera_location.times(
      Mat4.translation(x_cam_hor_tran, y_cam_hor_tran, 0)
    );
    this.light_pos = Mat4.identity()
      .times(Mat4.translation(-x_cam_hor_tran, -y_cam_hor_tran, 0))
      .times(this.light_pos);
    // console.log(this.light_pos);
  }

  cameraChangeAndRestStateChange(translation_x, translation_y) {
    this.figure_rest_state_transform = this.figure_start_state_transform;
    const [x_trans, y_trans] = this.next_dir
      ? [translation_x, 0]
      : [0, -translation_x];
    //x-direction mode (?)
    if (this.next_dir) {
      if (this.charge_time !== 0) {
        this.camera_horizontal_translation = translation_x;
      }
      //z-direction mode (?)
    } else {
      if (this.charge_time !== 0) {
        this.camera_depth_translation = -translation_x;
      }
    }
    this.figure_rest_state_transform = this.figure_rest_state_transform.times(
      Mat4.translation(x_trans, y_trans, -translation_y)
    );
    this.m_x_trans = x_trans;
    this.m_y_trans = y_trans;
  }

  drawFigure(
    context,
    program_state,
    is_falling = false,
    is_rotating = false,
    edge = 0
  ) {
    let dt = program_state.animation_delta_time / 1000;
    if (is_falling) {

      if (this.fall_dis > 0.5) {
        this.shapes.chess.draw(
          context,
          program_state,
          this.figure_rest_state_transform
            .times(Mat4.scale(1, 1, 1))
            .times(Mat4.rotation(Math.PI, 1, 0,0))
            .times(Mat4.translation(0, 0, this.fall_dis)),
          this.materials.character
        );
        this.fall_dis -= 0.025;
      } else {
        this.shapes.chess.draw(
          context,
          program_state,
          this.figure_rest_state_transform
            .times(Mat4.scale(1, 1, 1))
            .times(Mat4.rotation(Math.PI, 1, 0,0))
            .times(Mat4.translation(0, 0, -0.5)),
          this.materials.character
        );
      }
    } else if (is_rotating) {
      //this.doGameOver()
      const rotation_time = 0.8;
      const angular_v = Math.PI / (2 * rotation_time);
      const fall_speed = 2;
      if (this.falling_rotation < Math.PI / 2) {
        this.falling_rotation += angular_v * dt;
        let temp_transform_matrix = this.figure_rest_state_transform;
        //landed on the far edge of the first box or landed on the far edge of the second box
        if (
          edge === LANDED_ON_EDGE_BOX1 ||
          (edge != LANDED_ON_EDGE_BOX1 && !this.near_edge)
        ) {
          temp_transform_matrix = this.last_dir
            ? temp_transform_matrix
                .times(Mat4.translation(-this.axis_offset, 0, -1.5))
                .times(Mat4.rotation(-this.falling_rotation, 0, 1, 0))
                .times(Mat4.translation(this.axis_offset, 0, -1.5))
            : temp_transform_matrix
                .times(Mat4.translation(0, this.axis_offset, -1.5))
                .times(Mat4.rotation(-this.falling_rotation, 1, 0, 0))
                .times(Mat4.translation(0, -this.axis_offset, -1.5));
          // if (this.last_dir){console.log("far edge of the first box x-dir")}
          // else{console.log("far edge of the first box z-dir")}
        }
        //landed on the near edge of the second box
        else {
          temp_transform_matrix = this.last_dir
            ? temp_transform_matrix
                .times(Mat4.translation(this.axis_offset, 0, -1.5))
                .times(Mat4.rotation(this.falling_rotation, 0, 1, 0))
                .times(Mat4.translation(-this.axis_offset, 0, -1.5))
            : temp_transform_matrix
                .times(Mat4.translation(0, -this.axis_offset, -1.5))
                .times(Mat4.rotation(this.falling_rotation, 1, 0, 0))
                .times(Mat4.translation(0, this.axis_offset, -1.5));
          // if (this.last_dir){console.log("near edge of the second box x-dir")}
          // else{console.log("near edge of the second box z-dir")}
        }
        this.last_RF_transform = temp_transform_matrix;
        this.shapes.chess.draw(
          context,
          program_state,
          temp_transform_matrix.times(Mat4.scale(1, 1, 1)).times(Mat4.rotation(Math.PI, 1, 0,0)),
          this.materials.character
        );
      } else {
        if (this.fall_dis_2 < 1) {
          this.fall_dis_2 += fall_speed * dt;
        }
        let temp_transform_matrix = this.last_RF_transform;
        if (
          edge === LANDED_ON_EDGE_BOX1 ||
          (edge != LANDED_ON_EDGE_BOX1 && !this.near_edge)
        ) {
          temp_transform_matrix = this.last_dir
            ? temp_transform_matrix.times(
                Mat4.translation(this.fall_dis_2, 0, 0)
              )
            : temp_transform_matrix.times(
                Mat4.translation(0, -this.fall_dis_2, 0)
              );
        } else {
          temp_transform_matrix = this.last_dir
            ? temp_transform_matrix.times(
                Mat4.translation(-this.fall_dis_2, 0, 0)
              )
            : temp_transform_matrix.times(
                Mat4.translation(0, this.fall_dis_2, 0)
              );
        }
        this.shapes.chess.draw(
          context,
          program_state,
          temp_transform_matrix.times(Mat4.scale(1, 1, 1)).times(Mat4.rotation(Math.PI, 1, 0,0)),
          this.materials.character
        );
      }
    } else if (this.charging) {
      if (this.charging_scale > 1.25) {
        this.charging_scale -= 0.01;
      }
      this.shapes.chess.draw(
        context,
        program_state,
        this.figure_rest_state_transform
          .times(Mat4.scale(1, 1, this.charging_scale))
          .times(Mat4.translation(0, 0, -1.5))
          .times(Mat4.rotation(Math.PI, 1, 0,0)),
        this.materials.character
      );
    } else {
      this.charging_scale = 2;
      //get numerator
      let trans = this.m_x_trans ? this.m_x_trans : this.m_y_trans;
      //get denominator
      let total_trans = this.jump_distance;
      //get current rotation angle
      let angle = total_trans ? (trans / total_trans) * 2*Math.PI : 0;
      //we cannot change figure_rest_state_transform since it is also used for the camera translation.
      //so create a temp variable here to encode the rotation of the figure
      let temp_transform_matrix = this.figure_rest_state_transform.times(
        Mat4.translation(0, 0, -3)
      );
      //determine the rotation axis based on the current direction
      temp_transform_matrix = this.next_dir
        ? temp_transform_matrix.times(Mat4.rotation(-angle, 0, 1, 0))
        : temp_transform_matrix.times(Mat4.rotation(angle, 1, 0, 0));
      this.shapes.chess.draw(
        context,
        program_state,
        temp_transform_matrix.times(Mat4.scale(1, 1, 1)).times(Mat4.rotation(Math.PI, 1, 0,0)),
        this.materials.character
      );
    }
  }

  checkAndJump(context, program_state, translation_x, translation_y) {
    if (-translation_y > 0) {
      //TODO: maybe a better way to sync these
      this.last_dir = this.next_dir;
      let check_result = this.checkGameOver();
      if (check_result[0] === DIRECT_FALLING) {
        this.drawFigure(context, program_state, true);
        return;
      } else if (check_result[0] === ROTATE_AND_FALLING) {
        if (check_result[1] === LANDED_ON_EDGE_BOX1) {
          this.drawFigure(
            context,
            program_state,
            false,
            true,
            LANDED_ON_EDGE_BOX1
          );
          return;
        } else {
          this.drawFigure(
            context,
            program_state,
            false,
            true,
            LANDED_ON_EDGE_BOX2
          );
          return;
        }
      }
      this.drawFigure(context, program_state);
      //reset all timers
      this.resetTimers();
      //change camera initial location
      this.changeInitCameraLoc();
      //reset camera translations before next jump
      this.resetCameraTranslations();
      this.figure_start_state_transform = this.figure_rest_state_transform;
    } else {
      this.cameraChangeAndRestStateChange(translation_x, translation_y);
      this.drawFigure(context, program_state);
    }
  }

  draw_figure(context, program_state, t0, charge_time) {
    // properties
    const [translation_x, translation_y] = this.getXYTranslations(
      t0,
      charge_time,
      program_state
    );
    //This is what happens at the end of a jump
    this.checkAndJump(context, program_state, translation_x, translation_y);
  }

  drawBoxes(context, program_state) {
    let model_transform_box = Mat4.identity();
    for (let i = 0; i < this.box_translate_queue.length; i++) {
      model_transform_box = this.draw_box(
        context,
        program_state,
        model_transform_box,
        i
      );
    }
  }

  setUpChargingTime() {
    this.charge_time = 0;
    if (!this.charging) {
      this.charge_time = this.charging_end_time - this.charging_begin_time;
    }
  }

  setUpCameraLoc(program_state) {
    const desired = this.initial_camera_location.times(
      Mat4.translation(
        -this.camera_horizontal_translation,
        -this.camera_depth_translation,
        0
      )
    );
    program_state.set_camera(desired);
    const desired_light = Mat4.identity()
      .times(
        Mat4.translation(
          -this.camera_horizontal_translation,
          -this.camera_depth_translation,
          0
        )
      )
      .times(this.light_pos);
    // console.log(
    //   -this.camera_horizontal_translation,
    //   -this.camera_depth_translation,
    //   this.light_pos,
    //   desired_light
    // );
    program_state.lights = [new Light(desired_light, color(1, 1, 1, 1), 80000)];
  }

  display(context, program_state) {
    // set up
    if (!this.mouse_enabled) {
      this.add_mouse_controls(context.canvas);
      this.mouse_enabled = true;
    }
    super.display(context, program_state);

    // draw & change camera
    this.setUpCameraLoc(program_state);
    this.setUpChargingTime();
    this.draw_figure(
      context,
      program_state,
      this.charging_end_time,
      this.charge_time
    );
    //change camera
    this.floating_floor(context, program_state);
    this.drawBoxes(context, program_state);
  }
}
