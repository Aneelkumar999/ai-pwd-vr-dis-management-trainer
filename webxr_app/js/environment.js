AFRAME.registerComponent('city-environment', {
    schema: {
        gridSize: { type: 'number', default: 10 },
        buildingCount: { type: 'number', default: 20 }
    },

    init: function () {
        this.materials = new Map(); // Cache materials

        this.createGround();

        // Expanded grid for "MANY" buildings
        for (let x = -100; x <= 100; x += 15) {
            for (let z = -100; z <= 100; z += 15) {
                // Determine building type based on position/randomness
                // Increased probability to 0.7 for more density
                if (Math.random() < 0.7 && (x !== 0 || z !== 0)) {
                    let type = 'house';

                    // Industrial Zone (Negative X)
                    if (x < -40) {
                        type = Math.random() > 0.5 ? 'factory' : 'tank';
                    } else {
                        // Urban Zone
                        type = Math.random() > 0.3 ? 'skyscraper' : 'house';
                    }

                    this.createBuilding(x, z, type);
                }
            }
        }
    },

    createGround: function () {
        let ground = document.createElement('a-plane');
        ground.setAttribute('rotation', '-90 0 0');
        ground.setAttribute('width', 300);
        ground.setAttribute('height', 300);
        ground.setAttribute('color', '#333333'); // Asphalt color
        // Optional: Add a simple grid texture or noise if possible, but color is fine for now
        this.el.appendChild(ground);
    },

    createBuilding: function (x, z, type) {
        let buildingGroup = document.createElement('a-entity');
        buildingGroup.setAttribute('position', { x: x, y: 0, z: z });

        // Metadata for disaster manager targeting
        buildingGroup.setAttribute('class', 'building');
        buildingGroup.setAttribute('data-tx', x);
        buildingGroup.setAttribute('data-tz', z);

        if (type === 'skyscraper') {
            let width = 8 + Math.random() * 4;
            let depth = 8 + Math.random() * 4;
            let height = 15 + Math.random() * 20;

            // Texture generation
            let textureId = this.getBuildingTexture(type, width, height);

            let box = document.createElement('a-box');
            box.setAttribute('width', width);
            box.setAttribute('depth', depth);
            box.setAttribute('height', height);
            box.setAttribute('position', { x: 0, y: height / 2, z: 0 });
            box.setAttribute('material', `src: #${textureId}; repeat: 1 1; metalness: 0.1; roughness: 0.5`);

            buildingGroup.appendChild(box);
        } else if (type === 'factory') {
            // Factory: Wide, flat roof, industrial look
            let width = 12 + Math.random() * 5;
            let depth = 20 + Math.random() * 5;
            let height = 6 + Math.random() * 4;

            let box = document.createElement('a-box');
            box.setAttribute('width', width);
            box.setAttribute('depth', depth);
            box.setAttribute('height', height);
            box.setAttribute('position', { x: 0, y: height / 2, z: 0 });
            box.setAttribute('color', '#556677');
            // Could add smoke stacks here
            let stack = document.createElement('a-cylinder');
            stack.setAttribute('radius', 0.5);
            stack.setAttribute('height', 5);
            stack.setAttribute('position', { x: 2, y: height + 2.5, z: 2 });
            stack.setAttribute('color', '#333');
            buildingGroup.appendChild(stack);

            buildingGroup.appendChild(box);

        } else if (type === 'tank') {
            // Chemical Tank: Cylindrical
            let radius = 4 + Math.random() * 2;
            let height = 8 + Math.random() * 4;

            let cylinder = document.createElement('a-cylinder');
            cylinder.setAttribute('radius', radius);
            cylinder.setAttribute('height', height);
            cylinder.setAttribute('position', { x: 0, y: height / 2, z: 0 });
            cylinder.setAttribute('color', Math.random() > 0.5 ? '#CCCCCC' : '#DDDDDD'); // Metallic

            // Warning Stripe
            let stripe = document.createElement('a-ring');
            stripe.setAttribute('radius-inner', radius + 0.01);
            stripe.setAttribute('radius-outer', radius + 0.1);
            stripe.setAttribute('position', { x: 0, y: height / 2, z: 0 });
            stripe.setAttribute('rotation', '90 0 0');
            stripe.setAttribute('color', 'yellow');
            // Ring is flat, cylinder wrapper is better, but ring is okay for simple visual
            // Actually, simpler to just use a textured material or color band, but let's keep it simple geometry

            buildingGroup.appendChild(cylinder);

        } else {
            // House logic
            let width = 6;
            let depth = 8;
            let height = 4;

            // Main body
            let body = document.createElement('a-box');
            body.setAttribute('width', width);
            body.setAttribute('depth', depth);
            body.setAttribute('height', height);
            body.setAttribute('position', { x: 0, y: height / 2, z: 0 });
            body.setAttribute('color', '#E0C9A6'); // Beige walls

            // Roof
            let roof = document.createElement('a-cone');
            roof.setAttribute('radius-bottom', width * 0.8); // Approximation for pyramid roof
            roof.setAttribute('height', 3);
            roof.setAttribute('position', { x: 0, y: height + 1.5, z: 0 });
            roof.setAttribute('rotation', '0 45 0'); // Align square-ish
            roof.setAttribute('color', '#8B4513'); // Brown roof
            // Flatten cone to look more like a roof (scale z?) - simple cone is okay for MVP

            // Door/Window decals could be added here as planes if needed for extra detail
            // For now, simple geometry is better than boxes.

            buildingGroup.appendChild(body);
            buildingGroup.appendChild(roof);
        }

        this.el.appendChild(buildingGroup);
    },

    getBuildingTexture: function (type, width, height) {
        // Cache key
        let key = `${type}_${Math.floor(width)}_${Math.floor(height)}`;
        if (this.materials.has(key)) return this.materials.get(key);

        // Create canvas
        let canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 512;
        let ctx = canvas.getContext('2d');

        // Background (Building Wall)
        ctx.fillStyle = Math.random() > 0.5 ? '#444455' : '#666677'; // Slate or concrete
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Windows
        if (type === 'skyscraper') {
            ctx.fillStyle = '#88CCFF'; // Glass blue
            let rows = 15;
            let cols = 6;
            let padX = 10;
            let padY = 15;
            let w = (canvas.width - (cols + 1) * padX) / cols;
            let h = (canvas.height - (rows + 1) * padY) / rows;

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    // Random light variation
                    ctx.fillStyle = Math.random() > 0.3 ? '#88CCFF' : '#223344'; // Lit vs unlit
                    ctx.fillRect(padX + i * (w + padX), padY + j * (h + padY), w, h);
                }
            }
        }

        let textureId = 'tex_' + key;
        let img = document.createElement('img');
        img.id = textureId;
        img.src = canvas.toDataURL();

        document.querySelector('a-assets').appendChild(img);
        this.materials.set(key, textureId);

        return textureId;
    }
});
