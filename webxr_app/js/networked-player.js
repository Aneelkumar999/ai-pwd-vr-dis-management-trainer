AFRAME.registerComponent('networked-player', {
    schema: {
        serverUrl: { type: 'string', default: window.BACKEND_URL || 'http://localhost:5000' }
    },

    init: function () {
        this.socket = io(this.data.serverUrl);
        this.otherPlayers = {}; // Store references to other player entities

        this.socket.on('connect', () => {
            console.log("Networked Player Connected");
            this.socket.emit('join_game');
        });

        // Listen for updates
        this.socket.on('current_players', (players) => {
            for (let id in players) {
                if (id !== this.socket.id) {
                    this.spawnOtherPlayer(id, players[id]);
                }
            }
        });

        this.socket.on('new_player', (userInfo) => {
            if (userInfo.id !== this.socket.id) {
                this.spawnOtherPlayer(userInfo.id, userInfo.data);
            }
        });

        this.socket.on('player_moved', (userInfo) => {
            this.updateOtherPlayer(userInfo.id, userInfo.data);
        });

        this.socket.on('player_disconnected', (userInfo) => {
            this.removeOtherPlayer(userInfo.id);
        });
    },

    tick: function (time, timeDelta) {
        if (!this.socket.connected) return;

        // Send my position to server
        let pos = this.el.object3D.position;
        let rot = this.el.object3D.rotation;

        this.socket.emit('player_update', {
            pos: { x: pos.x, y: pos.y, z: pos.z },
            rot: { x: rot.x, y: rot.y, z: rot.z }
        });
    },

    spawnOtherPlayer: function (id, data) {
        if (this.otherPlayers[id]) return;

        let entity = document.createElement('a-entity');
        entity.setAttribute('geometry', 'primitive: cylinder; height: 1.8; radius: 0.3');
        entity.setAttribute('material', 'color: purple'); // Other players are purple
        entity.setAttribute('position', data.pos);

        this.el.sceneEl.appendChild(entity);
        this.otherPlayers[id] = entity;
    },

    updateOtherPlayer: function (id, data) {
        let entity = this.otherPlayers[id];
        if (entity) {
            entity.setAttribute('position', data.pos);
            // entity.object3D.rotation.set(data.rot.x, data.rot.y, data.rot.z); // detailed rotation
        }
    },

    removeOtherPlayer: function (id) {
        let entity = this.otherPlayers[id];
        if (entity) {
            entity.parentNode.removeChild(entity);
            delete this.otherPlayers[id];
        }
    }
});
