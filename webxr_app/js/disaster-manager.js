// Water Flow Component for Flood Animation
AFRAME.registerComponent('water-flow', {
    schema: {
        speed: { type: 'vec2', default: { x: 0.1, y: 0.1 } }
    },
    init: function () {
        this.material = this.el.getObject3D('mesh').material;
        if (this.material.map) {
            this.material.map.repeat.set(10, 10);
        }
    },
    tick: function (time, timeDelta) {
        if (this.material && this.material.map) {
            this.material.map.offset.x += this.data.speed.x * (timeDelta / 1000);
            this.material.map.offset.y += this.data.speed.y * (timeDelta / 1000);
        }
    }
});

AFRAME.registerComponent('disaster-manager', {
    schema: {
        serverUrl: { type: 'string', default: 'https://ai-powered-vr-disaster-management-trainer.onrender.com' }
    },

    init: function () {
        console.log("Disaster Manager Initializing...");

        this.socket = io(this.data.serverUrl);

        this.socket.on('connect', () => {
            console.log("Connected to AI Backend!");
        });

        this.socket.on('status_update', (data) => {
            if (data.disaster_type === 'flood' && data.hazards.length > 0) {
                let level = data.hazards[0].water_level;
                this.updateFloodLevel(level);
            } else if (data.disaster_type === 'earthquake' || data.disaster_type === 'fire') {
                data.hazards.forEach(hazard => {
                    this.updateBuildingState(hazard);
                });
            }
        });

        this.socket.on('simulation_started', (data) => {
            console.log("Disaster Started:", data);
            this.triggerDisaster(data.disaster_type);
        });

        // Load assets if needed
        this.ensureAssets();
    },

    ensureAssets: function () {
        // Create water texture if not exists
        if (!document.getElementById('waterTexture')) {
            let canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            let ctx = canvas.getContext('2d');

            // Draw Blue noise/waves
            ctx.fillStyle = '#006994';
            ctx.fillRect(0, 0, 512, 512);
            ctx.fillStyle = '#0088bb';
            for (let i = 0; i < 100; i++) {
                ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 50 + 20, Math.random() * 20 + 5);
            }

            let img = document.createElement('img');
            img.id = 'waterTexture';
            img.src = canvas.toDataURL();
            document.querySelector('a-assets').appendChild(img);
        }
    },

    triggerDisaster: function (type) {
        let sceneEl = this.el.sceneEl;
        if (type === 'fire') {
            let sky = sceneEl.querySelector('a-sky');
            sky.setAttribute('color', '#552200'); // Smoky orange/dark
            sky.setAttribute('animation', 'property: color; to: #FF4500; dur: 5000; dir: alternate; loop: true');

            this.createFireEffect();

            // Ignite buildings!
            let buildings = document.querySelectorAll('.building');
            buildings.forEach(building => {
                // 50% chance for any given building to catch fire immediately
                if (Math.random() > 0.5) {
                    this.igniteBuilding(building);
                }
            });

            // Hide flood if active
            let water = sceneEl.querySelector('#floodPlane');
            if (water) water.setAttribute('visible', false);
        } else if (type === 'flood') {
            let sky = sceneEl.querySelector('a-sky');
            sky.setAttribute('color', '#8899AA'); // Cloudy sky
            sky.removeAttribute('animation');

            let water = sceneEl.querySelector('#floodPlane');
            if (water) {
                water.setAttribute('visible', true);
                water.setAttribute('position', { x: 0, y: 0.1, z: 0 });
                // Use new texture and flow component
                water.setAttribute('material', 'src: #waterTexture; transparent: true; opacity: 0.9');
                water.setAttribute('water-flow', 'speed: 0.05 0.05');
            }

            // Trigger AI Evacuation
            let agents = document.querySelectorAll('[ai-agent]');
            agents.forEach(agent => {
                agent.setAttribute('ai-agent', 'state', 'evacuate_flood');
            });
        } else if (type === 'earthquake') {
            this.earthquakeActive = true;
            this.shakeCamera();
            // Backend will send 'structure_fire' hazards or collapse status next
        } else if (type === 'chemical_spill') {
            let sky = sceneEl.querySelector('a-sky');
            sky.setAttribute('color', '#88AA88'); // Greenish tint
            sky.setAttribute('animation', 'property: color; to: #558855; dur: 4000; dir: alternate; loop: true');

            this.createChemicalEffect();

            // Optionally target tanks specifically?
            let tanks = document.querySelectorAll('.building[data-type="tank"]'); // If we added data-type
            // For now just general fog is good
        } else if (type === 'explosion') {
            // Instant event
            this.createExplosionEffect();
            // Shake camera briefly
            this.shakeCameraOnce();
        } else if (type === 'collapse') {
            // Collapse a random building
            let buildings = document.querySelectorAll('.building');
            if (buildings.length > 0) {
                let target = buildings[Math.floor(Math.random() * buildings.length)];
                this.collapseBuilding(target);
            }
        }
    },

    shakeCamera: function () {
        if (!this.earthquakeActive) return;

        let rig = document.querySelector('#rig');
        if (rig) {
            let intensity = 0.3;
            let shakeX = (Math.random() - 0.5) * intensity;
            let shakeY = (Math.random() - 0.5) * intensity + 1.6;
            let shakeZ = (Math.random() - 0.5) * intensity;
            rig.setAttribute('position', { x: shakeX, y: shakeY, z: shakeZ });
        }

        setTimeout(() => {
            if (this.earthquakeActive) requestAnimationFrame(this.shakeCamera.bind(this));
            else {
                let rig = document.querySelector('#rig');
                if (rig) rig.setAttribute('position', { x: 0, y: 1.6, z: 0 });
            }
        }, 50);
    },

    stopEarthquake: function () {
        this.earthquakeActive = false;
    },

    updateFloodLevel: function (level) {
        let sceneEl = this.el.sceneEl;
        let water = sceneEl.querySelector('#floodPlane');
        if (water) {
            // Smoothly animate water rising
            water.setAttribute('animation', `property: position.y; to: ${level}; dur: 1000; easing: linear`);
        }
    },

    updateBuildingState: function (hazard) {
        let x = hazard.location.x;
        let z = hazard.location.z;
        // Find building by custom attribute
        let building = document.querySelector(`.building[data-tx="${x}"][data-tz="${z}"]`);

        // If exact match fails, try finding closest building (grid system might be loose)
        if (!building) {
            // Simple proximity check could be added here if needed
            return;
        }

        if (hazard.type === 'structure_fire' && hazard.state === 'burning') {
            if (!building.querySelector('.building-fire-system')) {
                this.igniteBuilding(building);
            }
        } else if (hazard.type === 'collapse' && hazard.state === 'collapsed') {
            // Collapse visual
            if (!building.classList.contains('collapsed')) {
                building.classList.add('collapsed');

                // Animate box flattening
                let box = building.querySelector('a-box') || building;
                let originalHeight = box.getAttribute('height') || 10;

                box.setAttribute('animation', {
                    property: 'scale',
                    to: '1 0.2 1',
                    dur: 1500,
                    easing: 'easeInQuad'
                });

                // Spawn Debris
                for (let i = 0; i < 5; i++) {
                    let debris = document.createElement('a-box');
                    debris.setAttribute('color', '#555');
                    debris.setAttribute('depth', 1);
                    debris.setAttribute('width', 1);
                    debris.setAttribute('height', 1);
                    let rx = (Math.random() - 0.5) * 4;
                    let rz = (Math.random() - 0.5) * 4;
                    debris.setAttribute('position', { x: rx, y: originalHeight, z: rz });

                    // Fall animation
                    debris.setAttribute('animation', {
                        property: 'position',
                        to: `${rx} 0.5 ${rz}`,
                        dur: 1500 + Math.random() * 500,
                        easing: 'easeInBounce'
                    });

                    building.appendChild(debris);
                }

                // Create dust cloud
                let dust = document.createElement('a-entity');
                dust.setAttribute('position', '0 1 0');
                try {
                    dust.setAttribute('particle-system', 'preset: dust; color: #888888; particleCount: 200; size: 2; maxAge: 2');
                } catch (e) { }
                building.appendChild(dust);
            }
        }
    },

    stopDisaster: function (type) {
        console.log("Stopping Disaster:", type);
        let sceneEl = this.el.sceneEl;

        if (type === 'fire') {
            // Remove global fire
            let oldFire = sceneEl.querySelector('#activeFire');
            if (oldFire) oldFire.parentNode.removeChild(oldFire);

            // Remove building fires
            document.querySelectorAll('.building-fire-system').forEach(el => el.parentNode.removeChild(el));

            // Reset sky
            sceneEl.querySelector('a-sky').setAttribute('color', '#88CCFF');
            sceneEl.querySelector('a-sky').removeAttribute('animation');

        } else if (type === 'flood') {
            let water = sceneEl.querySelector('#floodPlane');
            if (water) {
                water.setAttribute('visible', false);
                water.setAttribute('position', '0 -1 0');
            }
            // Reset sky
            sceneEl.querySelector('a-sky').setAttribute('color', '#88CCFF');
        } else if (type === 'chemical_spill') {
            // Remove fog/spill
            let spill = sceneEl.querySelector('#activeSpill');
            if (spill) spill.parentNode.removeChild(spill);

            // Reset sky
            sceneEl.querySelector('a-sky').setAttribute('color', '#88CCFF');
            sceneEl.querySelector('a-sky').removeAttribute('animation');
        } else if (type === 'earthquake') {
            this.stopEarthquake();
        } else if (type === 'explosion' || type === 'collapse') {
            // These are mostly instant, but we could clean up debris or smoke if we tracked it
            // For now, no specific "stop" needed other than maybe stopping camera shake if it stuck
        }
    },

    shakeCameraOnce: function () {
        let rig = document.querySelector('#rig');
        if (rig) {
            // Simple kick
            rig.setAttribute('animation', 'property: position; from: 0 1.6 0; to: 0.2 1.8 0.1; dur: 100; dir: alternate; loop: 2');
            setTimeout(() => {
                rig.removeAttribute('animation');
                rig.setAttribute('position', '0 1.6 0');
            }, 300);
        }
    },

    createChemicalEffect: function () {
        let sceneEl = this.el.sceneEl;
        console.log("Creating Chemical Spill...");

        let oldSpill = sceneEl.querySelector('#activeSpill');
        if (oldSpill) oldSpill.parentNode.removeChild(oldSpill);

        let entity = document.createElement('a-entity');
        entity.setAttribute('id', 'activeSpill');

        // Low Ground Fog
        // Note: A-Frame particle system might not fully support 'fog' behavior identically to Unity, 
        // but we can simulate with low Y velocity and spread.
        try {
            entity.setAttribute('particle-system', 'preset: dust; color: #00FF00,#AAFFAA; particleCount: 2000; size: 2; positionSpread: 100 2 100; velocityValue: 0 0.2 0; maxAge: 10; opacity: 0.5');
        } catch (e) { }

        // Ground Liquid Overlay (Green Plane)
        let liquid = document.createElement('a-plane');
        liquid.setAttribute('rotation', '-90 0 0');
        liquid.setAttribute('width', 100);
        liquid.setAttribute('height', 100);
        liquid.setAttribute('color', '#00FF00');
        liquid.setAttribute('opacity', 0.5);
        liquid.setAttribute('position', '0 0.1 0');

        entity.appendChild(liquid);
        sceneEl.appendChild(entity);
    },

    createExplosionEffect: function () {
        // Create an explosion at a random location or near player
        let sceneEl = this.el.sceneEl;
        let pos = { x: 0, y: 0, z: -15 }; // In front of player

        let boom = document.createElement('a-entity');
        boom.setAttribute('position', pos);

        // 1. Expanding Sphere (Shockwave)
        let shockwave = document.createElement('a-sphere');
        shockwave.setAttribute('color', '#FFFF00');
        shockwave.setAttribute('radius', 0.5);
        shockwave.setAttribute('opacity', 0.8);
        shockwave.setAttribute('material', 'transparent: true; shader: flat');
        shockwave.setAttribute('animation', 'property: radius; to: 20; dur: 500; easing: easeOutQuad');
        shockwave.setAttribute('animation__fade', 'property: opacity; to: 0; dur: 500; easing: easeOutQuad');

        // 2. Burst Particles
        try {
            boom.setAttribute('particle-system', 'preset: default; color: #FF4500,#FFFF00; particleCount: 500; size: 2; velocityValue: 0 5 0; positionSpread: 2 2 2; maxAge: 1; explosion: true'); // Note: 'explosion' param relies on tailored velocity/spread in default component
            // Manual velocity burst is more reliable without specific 'explosion' preset if not available
            // Let's rely on high velocity
        } catch (e) { }

        // Sound? (Optional)

        boom.appendChild(shockwave);
        sceneEl.appendChild(boom);

        // Auto-cleanup
        setTimeout(() => {
            if (boom.parentNode) boom.parentNode.removeChild(boom);
        }, 2000);
    },

    collapseBuilding: function (building) {
        if (!building.classList.contains('collapsed')) {
            building.classList.add('collapsed');
            // Animate box flattening
            let box = building.querySelector('a-box') || building.querySelector('a-cylinder') || building; // Handle tanks too!
            let originalHeight = box.getAttribute('height') || 10;

            box.setAttribute('animation', {
                property: 'scale',
                to: '1 0.2 1',
                dur: 1500,
                easing: 'easeInQuad'
            });

            // ... Debris logic (reused or reimplemented here if not shared)
            // For brevity, just the scaling for now, maybe add dust
            let dust = document.createElement('a-entity');
            dust.setAttribute('position', '0 1 0');
            try {
                dust.setAttribute('particle-system', 'preset: dust; color: #888888; particleCount: 200; size: 2; maxAge: 2');
            } catch (e) { }
            building.appendChild(dust);
        }
    },

    createFireEffect: function () {
        let sceneEl = this.el.sceneEl;
        console.log("Creating Global Fire Effect...");

        // Remove existing fire if any
        let oldFire = sceneEl.querySelector('#activeFire');
        if (oldFire) oldFire.parentNode.removeChild(oldFire);

        let entity = document.createElement('a-entity');
        entity.setAttribute('position', '0 0 -10'); // In front of player
        entity.setAttribute('id', 'activeFire');

        // Global ambient smoke/embers
        try {
            // Red/Orange Embers
            entity.setAttribute('particle-system', 'preset: dust; color: #FF0000,#FF4500; particleCount: 1000; size: 0.2; velocityValue: 0 5 0; positionSpread: 50 10 50; maxAge: 5');
        } catch (e) { }

        sceneEl.appendChild(entity);
    },

    igniteBuilding: function (building) {
        // Main Fire System
        let fireEntity = document.createElement('a-entity');
        fireEntity.setAttribute('position', '0 0 0'); // Center of building
        fireEntity.classList.add('building-fire-system');

        // 1. Intense Red Fire Particles (Firecamp style)
        // Using 'velocityValue' with upward Y to simulate rising flames
        try {
            fireEntity.setAttribute('particle-system', 'preset: fire; color: #FF0000,#FFFF00; size: 5; particleCount: 300; maxAge: 1; velocityValue: 0 8 0; positionSpread: 2 0 2; blending: 1');
        } catch (e) { }

        // 2. Thick Dark Smoke
        let smokeEntity = document.createElement('a-entity');
        smokeEntity.setAttribute('position', '0 5 0');
        try {
            smokeEntity.setAttribute('particle-system', 'preset: dust; color: #111111,#000000; size: 8; particleCount: 100; texture: https://cdn.aframe.io/a-painter/images/smoke.png; velocityValue: 0 4 0; maxAge: 4; positionSpread: 3 0 3');
        } catch (e) { }

        // 3. Central "Burning Sensation" Core Light
        let fireLight = document.createElement('a-light');
        fireLight.setAttribute('type', 'point');
        fireLight.setAttribute('color', '#FF2200');
        fireLight.setAttribute('intensity', '2.0');
        fireLight.setAttribute('distance', '20');
        fireLight.setAttribute('animation', 'property: intensity; from: 1.5; to: 2.5; dur: 100; dir: alternate; loop: true');

        // 4. Glowing Red Core Sphere
        let glow = document.createElement('a-sphere');
        glow.setAttribute('color', '#FF2200'); // Deep Red
        glow.setAttribute('radius', 5);
        glow.setAttribute('opacity', 0.4);
        glow.setAttribute('material', 'shader: flat; transparent: true');
        glow.setAttribute('animation', 'property: radius; from: 4.8; to: 5.2; dur: 200; dir: alternate; loop: true');

        fireEntity.appendChild(fireLight);
        fireEntity.appendChild(glow);
        fireEntity.appendChild(smokeEntity);
        building.appendChild(fireEntity);

        // Set building color to charred black
        let box = building.querySelector('a-box');
        if (box) box.setAttribute('color', '#1a0505');
    }
});
