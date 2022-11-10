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
      Mat4.translation(-5, 0, 0)
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
    this.figure_start_state_transform = Mat4.identity().times(
      Mat4.translation(0, 0, -3).times(Mat4.translation(0, 0, 0))
    );
    this.figure_rest_state_transform = Mat4.identity();
    //x: true, z: false
    this.next_dir = true;

    //game over sign
    this.game_over = false;

    //for camera translation
    this.camera_horizontal_translation = 0;
    this.camera_depth_translation = 0;

    this.fall_dis = 2;

    this.jump_distance = 0
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
        if (!this.audio_play_start) {
          this.audio_play_start = true;
          this.audio.play();
        }
        this.charging_begin_time = this.time;
      },
      undefined,
      () => {
        this.charging_end_time = this.time;
        if (!this.game_over) {
          this.charging = false;
        }
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
    this.first_jump_box =
      this.box_translate_queue[this.box_translate_queue.length - 2];
    this.second_jump_box =
      this.box_translate_queue[this.box_translate_queue.length - 1];
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

    const box_mat = this.identity_mat.times(
      Mat4.translation(box_x, box_y, 0).times(Mat4.scale(2, 2, 1))
    );
    this.shapes.cube.draw(context, program_state, box_mat, this.materials.box);
    return model_transform;
  }

  areCollided(figure, box) {
    if (
      Math.abs(Math.abs(figure[0]) - Math.abs(box[0])) <= 2.7 &&
      Math.abs(Math.abs(figure[1]) - Math.abs(box[1])) <= 2.7
    ) {
      return true;
    }
    return false;
  }

  collideDetect(model_transform) {
    let figure = [model_transform[0][3], model_transform[1][3]];
    if (!this.next_dir) {
      figure = [model_transform[0][3], -model_transform[1][3]];
    }
    console.log(model_transform);
    if (this.areCollided(figure, this.first_jump_box)) {
      return 0;
    } else if (this.areCollided(figure, this.second_jump_box)) {
      this.prepare_jump();
      return 1;
    } else {
      return -1;
    }
  }

  getXYTranslations(t0, charge_time, program_state) {
    let local_charge_time = charge_time;
    const t_current = program_state.animation_time / 1000;
    const velocity_x_max = 12;
    const velocity_y_max = 6;
    const g = 12;
    const charge_time_max = 1;
    if (local_charge_time > charge_time_max) {
      local_charge_time = charge_time_max;
    }
    // calculate
    let velocity_x = 0
    let velocity_y = 0
    let translation_x = 0;
    let translation_y = 0;
    if (local_charge_time != 0) {
      velocity_x = (velocity_x_max * local_charge_time) / charge_time_max;
      velocity_y = (velocity_y_max * local_charge_time) / charge_time_max;
      let t_delta = t_current - t0;
      translation_x = t_delta * velocity_x;
      translation_y = t_delta * velocity_y + (1 / 2) * -g * t_delta ** 2;
    }
    this.jump_distance = velocity_x*(2*velocity_y/g)
    return [translation_x, translation_y];
  }

  checkGameOver() {
    if (this.collideDetect(this.figure_rest_state_transform) === -1) {
      this.game_over = true;
      this.setFloorColor(hex_color('#FF0000'));
      this.figure_start_state_transform = this.figure_rest_state_transform;
      if (!this.audio.paused) {
        this.audio.pause();
      }
      return true;
    }
    return false;
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
      Mat4.translation(x_trans, y_trans, -translation_y));
    this.m_x_trans = x_trans;
    this.m_y_trans = y_trans;
  }

  drawFigure(context, program_state, is_falling = false) {
    if (is_falling && this.fall_dis > 0) {
      this.figure_rest_state_transform = this.figure_rest_state_transform.times(
        Mat4.translation(0, 0, 0.1)
      );
      this.shapes.cube.draw(
        context,
        program_state,
        this.figure_rest_state_transform.times(Mat4.scale(0.7, 0.7, 2)),
        this.materials.character
      );
      this.fall_dis -= 0.1;
    } else {
      //get numerator
      let trans = this.m_x_trans ? this.m_x_trans : this.m_y_trans;
      //get denominator
      let total_trans = this.jump_distance
      //get current rotation angle
      let angle = total_trans ? (trans/total_trans)*Math.PI : 0;
      //we cannot change figure_rest_state_transform since it is also used for the camera translation.
      //so create a temp variable here to encode the rotation of the figure
      let temp_transform_matrix = this.figure_rest_state_transform;
      //determine the rotation axis based on the current direction
      temp_transform_matrix = this.next_dir ? temp_transform_matrix.times(Mat4.rotation(-angle,0,1,0)) :
          temp_transform_matrix.times(Mat4.rotation(angle,1,0,0))
      this.shapes.cube.draw(
        context,
        program_state,
        temp_transform_matrix.times(Mat4.scale(0.7, 0.7, 2)),
        this.materials.character
      );
    }
  }

  checkAndJump(context, program_state, translation_x, translation_y) {
    if (-translation_y > 0) {
      //TODO: maybe a better way to sync these
      this.last_dir = this.next_dir;
      if (this.checkGameOver()) {
        this.drawFigure(context, program_state, true);
        return;
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
    let desired = this.initial_camera_location.times(
      Mat4.translation(
        -this.camera_horizontal_translation,
        -this.camera_depth_translation,
        0
      )
    );
    program_state.set_camera(desired);
  }

  display(context, program_state) {
    super.display(context, program_state);
    this.draw_floor(context, program_state);
    this.drawBoxes(context, program_state);
    this.setUpChargingTime();
    this.draw_figure(
      context,
      program_state,
      this.charging_end_time,
      this.charge_time
    );
    //change camera
    this.setUpCameraLoc(program_state);
  }
}
