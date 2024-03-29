let player;
let cursors;
let layer;
let NoOfTargetsCoveredGroupByColor = {};
let boxesByColor = {};

let movesCount = 0;
let timeText;
let start = -1;

import * as Colors from '../consts/Color.js'
import {
  boxColorToTargetColor,
  targetColorToBoxColor
} from '../utils/ColorUtils.js'
import {
  Direction
} from '../consts/Direction.js'
import {
  offsetForDirection
} from '../utils/TileUtils.js'

export default class LevelCore extends Phaser.Scene {
  constructor(key, levelMap, nextLevel) {
    super({
      key: key
    });
    this.key = key;
    this.level = levelMap;
    this.nextLevel = nextLevel;
    this.hasReloaded = 0;
    this.currentTime = 0;
    this.timeToFinishLevel = 0;
    this.bufferTime = 0;
  }

  init() {}

  preload() {
    this.load.spritesheet('tiles', 'assets/Sokoban.png', {
      frameWidth: 128,
      startFrame: 0,
    });

    cursors = this.input.keyboard.createCursorKeys()
  }

  create() {
    var map = this.make.tilemap({
      data: this.level,
      tileWidth: 128,
      tileHeight: 128,
    });

    const tiles = map.addTilesetImage('tiles');
    layer = map.createLayer(0, tiles, 0, 0);

    player = layer.createFromTiles(52, 0, {
      key: 'tiles',
      frame: 52
    }).pop();
    player.setOrigin(0);

    this.createPlayerAnims();
    this.extractBoxes(layer);

    timeText = this.add
      .text(50, 32, `Time: ${this.timeToFinishLevel === 0 ? this.registry.get("time") : this.timeToFinishLevel}`, {
        fontFamily: 'GoogleSans, serif',
        fontStyle: 'bold'
      }, 2, 1, 0)
      .setFontSize(48)
      .setColor('black').setBackgroundColor('white');

    this.add
      .text(950, 1100, 'Reset level', {
        fontFamily: 'GoogleSans, serif',
        fontStyle: 'bold'
      }, 2, 1, 0)
      .setFontSize(30)
      .setColor('red').setBackgroundColor('white')
      .setInteractive()
      .once('pointerdown', this.restartLevel, this);
    this.add
      .text(750, 1100, 'End game', {
        fontFamily: 'GoogleSans, serif',
        fontStyle: 'bold'
      }, 2, 1, 0)
      .setFontSize(30)
      .setColor('red').setBackgroundColor('white')
      .setInteractive()
      .once('pointerdown', this.endGame, this);
  }

  update() {
    if (!cursors || !player) {
      return;
    }

    const justLeft = Phaser.Input.Keyboard.JustDown(cursors.left)
    const justRight = Phaser.Input.Keyboard.JustDown(cursors.right)
    const justUp = Phaser.Input.Keyboard.JustDown(cursors.up)
    const justDown = Phaser.Input.Keyboard.JustDown(cursors.down)

    if (justLeft) {
      const baseTween = {
        x: '-= 128',
        duration: 250
      }

      this.tweenMove(Direction['Left'], baseTween, () => {
        player.anims.play('left', true);
      })
    } else if (justRight) {
      const baseTween = {
        x: '+= 128',
        duration: 250
      }

      this.tweenMove(Direction['Right'], baseTween, () => {
        player.anims.play('right', true);
      })
    } else if (justUp) {
      const baseTween = {
        y: '-= 128',
        duration: 250
      }

      this.tweenMove(Direction['Up'], baseTween, () => {
        player.anims.play('up', true);
      })
    } else if (justDown) {
      const baseTween = {
        y: '+= 128',
        duration: 250
      }

      this.tweenMove(Direction['Down'], baseTween, () => {
        player.anims.play('down', true);
      })
    }

    if (start === -1 && movesCount === 1) {
      start = Date.now() / 1000;
    }
    
    if (movesCount >= 1) {
      this.currentTime = Date.now() / 1000;
      this.timePassed = this.currentTime - start;
      this.timeToFinishLevel = this.round((this.registry.get('time') + this.bufferTime + this.timePassed + 5 * this.hasReloaded));
      timeText.text = `Time: ${this.timeToFinishLevel}`;
    }

    if (this.allTargetCovered()) {
      this.bufferTime = 0;
      this.registry.set('time', this.registry.get('time') + this.timeToFinishLevel);
      this.registry.set('level', this.key);
      movesCount = 0;
      start = -1;
      if (this.key === 'Level10') {
        this.endGame();
      }
      this.scene.start(this.nextLevel)
    }
  }

  allTargetCovered() {
    const targetColors = Object.keys(NoOfTargetsCoveredGroupByColor)
    for (let i = 0; i < targetColors.length; ++i) {
      const targetColor = parseInt(targetColors[i]);
      const boxColor = targetColorToBoxColor(targetColor);
      if (!(boxColor in boxesByColor)) {
        continue;
      }

      const numBoxes = boxesByColor[boxColor].length
      const numCovered = NoOfTargetsCoveredGroupByColor[targetColor]

      if (numCovered !== numBoxes) {
        return false;
      }
    }
    return true;
  }

  extractBoxes(layer) {
    const boxColors = [
      Colors.BoxOrange,
      Colors.BoxRed,
      Colors.BoxBlue,
      Colors.BoxGreen,
      Colors.BoxGray
    ]

    boxColors.forEach(color => {
      boxesByColor[color] = layer.createFromTiles(color, 0, {
        key: 'tiles',
        frame: color
      }).map(box => box.setOrigin(0))

      const targetColor = boxColorToTargetColor(color);
      NoOfTargetsCoveredGroupByColor[targetColor] = 0
    })

  }

  tweenMove(direction, baseTween, onStart) {
    if (this.tweens.isTweening(player)) {
      return
    }

    const x = player.x
    const y = player.y
    const nextOffset = offsetForDirection(direction)
    const ox = x + nextOffset.x
    const oy = y + nextOffset.y

    const hasWall = this.hasWallAt(ox, oy)

    if (hasWall) {
      const key = player.anims.currentAnim.key
      player.anims.play(`${key}`, true);
      return
    }

    const boxData = this.getBoxDataAt(ox, oy)
    if (boxData) {
      const nx = nextOffset.x
      const ny = nextOffset.y

      const box = boxData.box

      const nextBoxData = this.getBoxDataAt(box.x + nx, box.y + ny)
      const isNextTileAWall = this.hasWallAt(box.x + nx, box.y + ny)

      if (isNextTileAWall || nextBoxData) {
        return;
      }

      const boxColor = boxData.color
      const targetColor = boxColorToTargetColor(boxColor)

      const coveredTarget = this.hasTargetAt(box.x, box.y, targetColor)
      if (coveredTarget) {
        this.changeNoOfTargetCoveredGroupByColor(targetColor, -1)
      }

      this.tweens.add(Object.assign(
        baseTween, {
          targets: box,
          onComplete: () => {
            const coveredTarget = this.hasTargetAt(box.x, box.y, targetColor);
            if (coveredTarget) {
              this.changeNoOfTargetCoveredGroupByColor(targetColor, 1);
            }
          }
        }
      ))
    }

    movesCount++
    this.tweens.add(Object.assign(
      baseTween, {
        targets: player,
        onComplete: this.stopPlayerAnimation,
        onCompleteScope: this,
        onStart
      }
    ))
  }

  stopPlayerAnimation() {
    if (!player) {
      return
    }
    const key = player.anims.currentAnim.key
    if (!key.startsWith('idle')) {
      player.anims.play(`idle-${key}`, true);
    }
  }

  changeNoOfTargetCoveredGroupByColor(color, change) {
    if (!(color in NoOfTargetsCoveredGroupByColor)) {
      NoOfTargetsCoveredGroupByColor[color] = 0
    }

    NoOfTargetsCoveredGroupByColor[color] += change
  }

  getBoxDataAt(x, y) {
    const keys = Object.keys(boxesByColor)
    for (let i = 0; i < keys.length; ++i) {
      const color = keys[i]
      const box = boxesByColor[color].find(box => {
        return box.getBounds().contains(x, y)
      })

      if (!box) continue
      return {
        box,
        color: parseInt(color)
      }
    }

    return undefined
  }

  hasWallAt(x, y) {
    if (!layer) return false
    const tile = layer.getTileAtWorldXY(x, y)
    if (!tile) return false
    return tile.index === 10 || tile.index === 6
  }

  hasTargetAt(x, y, tileIndex) {
    if (!layer) return false
    const tile = layer.getTileAtWorldXY(x, y)
    if (!tile) return false
    return tile.index === tileIndex
  }

  createPlayerAnims() {
    this.anims.create({
      key: 'idle-down',
      frames: [{
        key: 'tiles',
        frame: 52
      }]
    });

    this.anims.create({
      key: 'idle-left',
      frames: [{
        key: 'tiles',
        frame: 81
      }]
    });

    this.anims.create({
      key: 'idle-right',
      frames: [{
        key: 'tiles',
        frame: 78
      }]
    });

    this.anims.create({
      key: 'idle-up',
      frames: [{
        key: 'tiles',
        frame: 55
      }]
    });

    this.anims.create({
      key: 'left',
      frames: this.anims.generateFrameNumbers('tiles', {
        start: 81,
        end: 83,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'right',
      frames: this.anims.generateFrameNumbers('tiles', {
        start: 78,
        end: 80,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'up',
      frames: this.anims.generateFrameNumbers('tiles', {
        start: 55,
        end: 57,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'down',
      frames: this.anims.generateFrameNumbers('tiles', {
        start: 52,
        end: 54,
      }),
      frameRate: 10,
      repeat: -1,
    });
  }

  restartLevel() {
    if (this.hasReloaded === 0) {
      this.hasReloaded = 1;
    }
    movesCount = 0;
    start = -1;
    this.bufferTime = this.timeToFinishLevel;
    this.events.off();
    this.scene.restart();
  }

  endGame() {
    let time = this.registry.get('time');
    let level = this.registry.get('level') || "nolevel";
    let name = this.registry.get('name');
    let data = JSON.parse(localStorage.getItem('turns')) || [];
    data.push({
      name: name,
      time: time,
      level: level
    });
    localStorage.setItem('turns', JSON.stringify(data));
    this.scene.start('EndScene');
  }

  round(num) {
    return Math.round(num * 100) / 100;
  }
}
