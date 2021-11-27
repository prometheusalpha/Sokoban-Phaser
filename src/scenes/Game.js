var player;
var cursors;
var layer;
export default class Game extends Phaser.Scene{
  
    constructor(){
        super('hello')
    }
    
    //Nơi để load các assets trước khi chúng được sử dụng
    preload(){
        this.load.spritesheet('tiles', '../assets/sokoban_tilesheet@2.png', {
            frameWidth: 128,
            startFrame: 0
        })
    }
    //Nơi để thêm ra các đối tượng như image, text,... cần có trong Scene này
    create(){
         const level = [
           
             
            
            [99,   99,  100, 100, 100,  99,  99,  99,  99],
            [99,   99,  100,  51, 100,  99,  99,  99,  99],
            [99,   99,  100,   0, 100, 100, 100, 100,  99],
            [100, 100,  100,   8,   0,   8,  51, 100,  99],
            [100,  51,    0,   8,   0, 100, 100, 100,  99],
            [100, 100,  100, 100,   8, 100,  99,  99,  99],
            [99,   99,   99, 100,  51, 100,  99,  99,  99],
            [99,   99,   99, 100, 100, 100,  99,  99,  99],
            [99,   99,   99,  99,  99,  99,  99,  99,  99]
         ]

         const map = this.make.tilemap({
             data: level, 
             tileWidth: 128, 
             tileHeight: 128
         })

         const tiles = map.addTilesetImage('tiles')
         const layer = map.createStaticLayer(0, tiles, 0, 0)

        player = this.add.sprite(576,576, 'tiles', 52);

        this.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('tiles', { start: 52, end: 52}),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('tiles', { start: 81, end: 83}),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('tiles', { start: 78, end: 80}),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'up',
            frames: this.anims.generateFrameNumbers('tiles', { start: 55, end: 57}),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'down',
            frames: this.anims.generateFrameNumbers('tiles', { start: 52, end: 54}),
            frameRate: 10,
            repeat: -1
        });

        cursors = this.input.keyboard.createCursorKeys();

    }

    update(){
        if (cursors.left.isDown) {
            console.log()
            player.anims.play('left', true);
        } 
        else if (cursors.right.isDown) 
        {
            player.anims.play('right', true);
        }
        else if (cursors.up.isDown) 
        {
            player.anims.play('up', true);
        }
        else if (cursors.down.isDown) 
        {
            player.anims.play('down', true);
        }
        else
        {
           // player.anims.play('idle', true); 
            player.anims.pause();
        }
    }
       
}