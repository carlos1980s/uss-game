class MinaAdventureGame {
    constructor() {
        // Mobile detection first
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: !this.isMobile, // Disable antialias on mobile for performance
            powerPreference: this.isMobile ? 'low-power' : 'high-performance'
        });
        
        // Game state
        this.gameState = {
            health: 100,
            treasuresFound: 0,
            totalTreasures: 5,
            monstersNearby: 0,
            gameWon: false,
            gameOver: false,
            timeOfDay: 0 // 0 = sunset, 1 = night
        };
        
        // Lighting system for dynamic day/night cycle
        this.lightingSystem = {
            ambientLight: null,
            sunLight: null,
            fillLight: null,
            hemiLight: null,
            dayDuration: 300000, // 5 minutes for full sunset to night cycle
            startTime: Date.now()
        };
        
        // Characters
        this.mina = null;
        this.sacha = null;
        this.minaSpeed = 15; // Much faster for exciting gameplay
        this.minaPosition = new THREE.Vector3(0, 1.35, 80); // Start in clear area before Hollywood entrance
        this.sachaPosition = new THREE.Vector3(-3, 1.35, 80); // Start next to Mina in clear area
        
        // Game objects
        this.monsters = [];
        this.treasures = [];
        this.interactables = [];
        this.collisionObjects = []; // All objects that can be collided with
        this.npcs = []; // Non-player characters
        
        // Controls
        this.controls = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            run: false
        };
        
        this.mouseLocked = false;
        this.clock = new THREE.Clock();
        
        // Mobile controls
        this.mobileControls = {
            joystick: { x: 0, y: 0, active: false },
            run: false,
            cameraMode: false
        };
        
        // Speech bubble system
        this.speechSystem = {
            currentBubble: null,
            dialogues: [
                // Mina speaking
                { speaker: 'mina', text: 'Wow! Look at that huge castle, Sacha!' },
                { speaker: 'mina', text: 'I hope we can find all the treasures!' },
                { speaker: 'mina', text: 'This place is so cool! Like a real theme park!' },
                { speaker: 'mina', text: 'Stay close to me, those mummies look scary!' },
                { speaker: 'mina', text: 'I wonder what\'s inside that pyramid!' },
                { speaker: 'mina', text: 'Look how the lights change as it gets dark!' },
                { speaker: 'mina', text: 'Race you to that roller coaster!' },
                { speaker: 'mina', text: 'This is the best adventure ever!' },
                
                // Sacha responding  
                { speaker: 'sacha', text: 'Yeah! It\'s like we\'re in a movie!' },
                { speaker: 'sacha', text: 'Don\'t worry Mina, I\'ll help you find them!' },
                { speaker: 'sacha', text: 'I love all the bright colors everywhere!' },
                { speaker: 'sacha', text: 'I\'m right behind you! Let\'s stick together!' },
                { speaker: 'sacha', text: 'Maybe there\'s treasure hidden in there!' },
                { speaker: 'sacha', text: 'It\'s getting so mysterious and spooky!' },
                { speaker: 'sacha', text: 'You\'re on! But wait for me!' },
                { speaker: 'sacha', text: 'Best friends forever, Mina!' }
            ],
            lastSpeechTime: 0,
            speechInterval: 8000, // 8 seconds between speeches
            nextDialogueIndex: 0
        };
        
        this.init();
        this.setupEventListeners();
        this.createMina();
        this.createSacha();
        this.generateThemePark();
        this.placeTreasures();
        this.spawnMonsters();
        this.createNPCs();
        this.addParticleEffects();
        this.animate();
    }
    
    init() {
        console.log('Initializing Mina\'s Adventure...');
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xff4500); // Beautiful sunset orange sky
        
        // Mobile performance optimizations
        if (this.isMobile) {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio
            this.renderer.shadowMap.enabled = false; // Disable shadows on mobile
            console.log('Mobile optimizations enabled');
        } else {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        const container = document.getElementById('gameContainer');
        if (!container) {
            throw new Error('gameContainer element not found');
        }
        container.appendChild(this.renderer.domElement);
        
        // Third-person camera setup - start behind Mina
        this.cameraRotation = { horizontal: 0, vertical: 0 };
        this.camera.position.set(0, 6, 88); // Behind Mina's new starting position (she starts at z=80)
        console.log('Initial camera position set:', this.camera.position);
        console.log('Mina will be created at position:', this.minaPosition);
        
        // Dynamic lighting system - starts at sunset
        this.lightingSystem.ambientLight = new THREE.AmbientLight(0xff6b47, 0.4); // Warm orange ambient
        this.scene.add(this.lightingSystem.ambientLight);
        
        // Setting sun light - low angle, warm colors
        this.lightingSystem.sunLight = new THREE.DirectionalLight(0xff8c42, 1.0); // Golden sunset color
        this.lightingSystem.sunLight.position.set(-80, 30, 100); // Low on horizon, from the west
        this.lightingSystem.sunLight.castShadow = true;
        this.lightingSystem.sunLight.shadow.mapSize.width = 4096;
        this.lightingSystem.sunLight.shadow.mapSize.height = 4096;
        this.lightingSystem.sunLight.shadow.camera.near = 0.5;
        this.lightingSystem.sunLight.shadow.camera.far = 500;
        this.lightingSystem.sunLight.shadow.camera.left = -200;
        this.lightingSystem.sunLight.shadow.camera.right = 200;
        this.lightingSystem.sunLight.shadow.camera.top = 200;
        this.lightingSystem.sunLight.shadow.camera.bottom = -200;
        this.scene.add(this.lightingSystem.sunLight);
        
        // Purple twilight fill light from opposite side
        this.lightingSystem.fillLight = new THREE.DirectionalLight(0x9966cc, 0.4);
        this.lightingSystem.fillLight.position.set(80, 40, -100);
        this.scene.add(this.lightingSystem.fillLight);
        
        // Sunset hemisphere light - warm sky, cool ground
        this.lightingSystem.hemiLight = new THREE.HemisphereLight(0xff6600, 0x4b0082, 0.6); // Orange sky to purple ground
        this.lightingSystem.hemiLight.position.set(0, 100, 0);
        this.scene.add(this.lightingSystem.hemiLight);
        
        // Add some atmospheric fog for sunset mood
        this.scene.fog = new THREE.Fog(0xff4500, 50, 300); // Orange fog that fades to distance
        
        // Zone-specific atmospheric lighting
        this.addZoneLighting();
        
        // Initial camera look direction
        this.camera.lookAt(new THREE.Vector3(0, 1.35, 80)); // Look at Mina's new starting position
    }
    
    addZoneLighting() {
        // Ancient Egypt - enhanced warm golden lighting for sunset
        const egyptLight = new THREE.PointLight(0xff8c00, 1.2, 120); // Brighter orange-gold
        egyptLight.position.set(-80, 25, 0);
        egyptLight.castShadow = true;
        this.scene.add(egyptLight);
        
        // Far Far Away - enhanced magical purple lighting
        const fairytaleLight = new THREE.PointLight(0xda70d6, 0.9, 100); // Brighter orchid
        fairytaleLight.position.set(-80, 35, 80);
        this.scene.add(fairytaleLight);
        
        // Sci-Fi City - enhanced cool blue/cyan lighting
        const scifiLight = new THREE.PointLight(0x00bfff, 1.0, 110); // Brighter deep sky blue
        scifiLight.position.set(80, 30, -80);
        this.scene.add(scifiLight);
        
        // Lost World - enhanced warm jungle lighting for sunset
        const jungleLight = new THREE.PointLight(0x32cd32, 0.8, 90); // Brighter lime green
        jungleLight.position.set(-80, 20, -80);
        this.scene.add(jungleLight);
        
        // Hollywood - warm spotlight for entrance
        const hollywoodLight = new THREE.SpotLight(0xffd700, 1.5, 100, Math.PI/4, 0.5);
        hollywoodLight.position.set(0, 50, 120);
        hollywoodLight.target.position.set(0, 0, 100);
        this.scene.add(hollywoodLight);
        this.scene.add(hollywoodLight.target);
        
        // New York - urban sunset lighting
        const newyorkLight = new THREE.PointLight(0xff6347, 0.8, 90); // Tomato red
        newyorkLight.position.set(80, 25, 80);
        this.scene.add(newyorkLight);
    }
    
    createCharacter(name, position, hairColor, shirtColor, pantsColor) {
        console.log(`Creating detailed character: ${name} at position:`, position);
        const characterGroup = new THREE.Group();
        
        // More detailed body with realistic materials
        const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.2);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: shirtColor,
            shininess: 10,
            specular: 0x444444
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        body.castShadow = true;
        characterGroup.add(body);
        
        // More realistic head
        const headGeometry = new THREE.SphereGeometry(0.15, 20, 16);
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffdbac,
            shininess: 30,
            specular: 0x444444
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.75;
        head.castShadow = true;
        characterGroup.add(head);
        
        // Enhanced hair with more detail
        const hairGeometry = new THREE.SphereGeometry(0.17, 16, 12);
        const hairMaterial = new THREE.MeshPhongMaterial({ 
            color: hairColor,
            shininess: 80,
            specular: 0x666666
        });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 0.82;
        hair.castShadow = true;
        characterGroup.add(hair);
        
        // More detailed hair strands
        for (let i = 0; i < 10; i++) {
            const strandGeometry = new THREE.CylinderGeometry(0.02, 0.01, 0.35, 8);
            const strand = new THREE.Mesh(strandGeometry, hairMaterial);
            const angle = (i / 10) * Math.PI * 2;
            const radius = 0.12 + (i % 3) * 0.015;
            strand.position.set(Math.cos(angle) * radius, 0.48, Math.sin(angle) * radius);
            strand.rotation.z = (Math.random() - 0.5) * 0.4;
            strand.rotation.x = (Math.random() - 0.5) * 0.2;
            strand.castShadow = true;
            characterGroup.add(strand);
        }
        
        // More detailed arms
        const armGeometry = new THREE.CylinderGeometry(0.05, 0.04, 0.3, 8);
        const armMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffdbac,
            shininess: 20,
            specular: 0x333333
        });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.25, 0.35, 0);
        leftArm.castShadow = true;
        characterGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.25, 0.35, 0);
        rightArm.castShadow = true;
        characterGroup.add(rightArm);
        
        // Enhanced legs
        const legGeometry = new THREE.CylinderGeometry(0.06, 0.05, 0.4, 8);
        const legMaterial = new THREE.MeshPhongMaterial({ 
            color: pantsColor,
            shininess: 5,
            specular: 0x222222
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.1, -0.2, 0);
        leftLeg.castShadow = true;
        characterGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.1, -0.2, 0);
        rightLeg.castShadow = true;
        characterGroup.add(rightLeg);
        
        // Add shoes
        const shoeGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.2);
        const shoeMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x000000,
            shininess: 60,
            specular: 0x555555
        });
        
        const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        leftShoe.position.set(-0.1, -0.43, 0.05);
        leftShoe.castShadow = true;
        characterGroup.add(leftShoe);
        
        const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
        rightShoe.position.set(0.1, -0.43, 0.05);
        rightShoe.castShadow = true;
        characterGroup.add(rightShoe);
        
        // Enhanced facial features with more detail
        // Larger, more detailed eyes
        const eyeWhiteGeometry = new THREE.SphereGeometry(0.035, 16, 12);
        const eyeWhiteMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffffff,
            shininess: 100,
            specular: 0x444444
        });
        
        const leftEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        leftEyeWhite.position.set(-0.07, 0.78, 0.13);
        characterGroup.add(leftEyeWhite);
        
        const rightEyeWhite = new THREE.Mesh(eyeWhiteGeometry, eyeWhiteMaterial);
        rightEyeWhite.position.set(0.07, 0.78, 0.13);
        characterGroup.add(rightEyeWhite);
        
        // More detailed iris with color variation
        const irisGeometry = new THREE.SphereGeometry(0.022, 12, 8);
        const irisColor = name === 'Mina' ? 0x87ceeb : 0x228b22; // Blue for Mina, green for Sacha
        const irisMaterial = new THREE.MeshPhongMaterial({ 
            color: irisColor,
            shininess: 80,
            specular: 0x666666
        });
        
        const leftIris = new THREE.Mesh(irisGeometry, irisMaterial);
        leftIris.position.set(-0.07, 0.78, 0.145);
        characterGroup.add(leftIris);
        
        const rightIris = new THREE.Mesh(irisGeometry, irisMaterial);
        rightIris.position.set(0.07, 0.78, 0.145);
        characterGroup.add(rightIris);
        
        // Larger pupils with more depth
        const pupilGeometry = new THREE.SphereGeometry(0.012, 8, 6);
        const pupilMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x000000,
            shininess: 200
        });
        
        const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        leftPupil.position.set(-0.07, 0.78, 0.155);
        characterGroup.add(leftPupil);
        
        const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
        rightPupil.position.set(0.07, 0.78, 0.155);
        characterGroup.add(rightPupil);
        
        // Add eye highlights for more life
        const highlightGeometry = new THREE.SphereGeometry(0.004, 6, 4);
        const highlightMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        const leftHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        leftHighlight.position.set(-0.065, 0.785, 0.16);
        characterGroup.add(leftHighlight);
        
        const rightHighlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        rightHighlight.position.set(0.075, 0.785, 0.16);
        characterGroup.add(rightHighlight);
        
        // Better eyebrows with more shape
        const eyebrowGeometry = new THREE.BoxGeometry(0.05, 0.012, 0.015);
        const eyebrowMaterial = new THREE.MeshPhongMaterial({ 
            color: hairColor,
            shininess: 60
        });
        
        const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
        leftEyebrow.position.set(-0.07, 0.825, 0.135);
        leftEyebrow.rotation.z = 0.15;
        characterGroup.add(leftEyebrow);
        
        const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
        rightEyebrow.position.set(0.07, 0.825, 0.135);
        rightEyebrow.rotation.z = -0.15;
        characterGroup.add(rightEyebrow);
        
        // More realistic nose
        const noseGeometry = new THREE.ConeGeometry(0.015, 0.04, 8);
        const noseMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffdbac,
            shininess: 20
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 0.75, 0.145);
        nose.rotation.x = Math.PI;
        characterGroup.add(nose);
        
        // Add nostrils for more detail
        const nostrilGeometry = new THREE.SphereGeometry(0.003, 6, 4);
        const nostrilMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8b4513,
            transparent: true,
            opacity: 0.8
        });
        
        const leftNostril = new THREE.Mesh(nostrilGeometry, nostrilMaterial);
        leftNostril.position.set(-0.008, 0.738, 0.15);
        characterGroup.add(leftNostril);
        
        const rightNostril = new THREE.Mesh(nostrilGeometry, nostrilMaterial);
        rightNostril.position.set(0.008, 0.738, 0.15);
        characterGroup.add(rightNostril);
        
        // Enhanced mouth with lips using PlaneGeometry
        const mouthGeometry = new THREE.PlaneGeometry(0.036, 0.016); // Width x Height
        const mouthMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xcd5c5c,
            shininess: 50,
            side: THREE.DoubleSide
        });
        const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
        mouth.position.set(0, 0.72, 0.145);
        mouth.rotation.x = -Math.PI / 2;
        characterGroup.add(mouth);
        
        // Add a subtle smile curve
        const smileGeometry = new THREE.TorusGeometry(0.015, 0.002, 4, 8, Math.PI);
        const smileMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8b0000,
            transparent: true,
            opacity: 0.6
        });
        const smile = new THREE.Mesh(smileGeometry, smileMaterial);
        smile.position.set(0, 0.715, 0.143);
        smile.rotation.x = Math.PI / 2;
        characterGroup.add(smile);
        
        // Scale up the character to make it more visible
        characterGroup.scale.set(3, 3, 3); // Make it 3x larger
        
        // Position character
        characterGroup.position.copy(position);
        characterGroup.userData.name = name;
        this.scene.add(characterGroup);
        
        console.log(`Character ${name} created successfully:`, {
            position: characterGroup.position,
            children: characterGroup.children.length,
            visible: characterGroup.visible,
            inScene: this.scene.children.includes(characterGroup)
        });
        
        return characterGroup;
    }
    
    createMina() {
        console.log('Creating Mina at position:', this.minaPosition);
        try {
            // Create a simple test version first to ensure basic functionality works
            const testSimple = false; // Try detailed character
            
            if (testSimple) {
                // Simple cube version for testing - LARGE and BRIGHT
                const geometry = new THREE.BoxGeometry(4, 7, 2); // Much larger
                const material = new THREE.MeshBasicMaterial({ 
                    color: 0xff0000,  // Bright red
                    wireframe: false
                });
                this.mina = new THREE.Mesh(geometry, material);
                this.mina.position.copy(this.minaPosition);
                this.mina.castShadow = true;
                this.scene.add(this.mina);
                console.log('Large red test Mina created at:', this.mina.position);
                
                // Add a spinning animation to make it very obvious
                this.mina.userData.spin = true;
            } else {
                // Use full character creation
                this.mina = this.createCharacter(
                    'Mina',
                    this.minaPosition,
                    0xffff80, // Blonde hair
                    0xff69b4, // Pink shirt
                    0x4169e1  // Blue jeans
                );
            }
            
            if (this.mina) {
                console.log('Mina created successfully! Position:', this.mina.position);
                console.log('Mina visible:', this.mina.visible);
                console.log('Mina in scene:', this.scene.children.includes(this.mina));
                if (this.mina.children) {
                    console.log('Mina children count:', this.mina.children.length);
                }
            } else {
                console.error('Mina creation returned null/undefined');
            }
        } catch (error) {
            console.error('Error creating Mina:', error);
            console.error('Error stack:', error.stack);
        }
    }
    
    createSacha() {
        this.sacha = this.createCharacter(
            'Sacha',
            this.sachaPosition,
            0x1a1a1a, // Black hair
            0x32cd32, // Green shirt
            0x8b4513  // Brown pants
        );
        
        // Add companion AI data
        this.sacha.userData.isCompanion = true;
        this.sacha.userData.followTarget = this.mina;
        this.sacha.userData.followDistance = 2.5;
        this.sacha.userData.catchupSpeed = 18; // Faster to keep up with Mina
        this.sacha.userData.walkSpeed = 15;   // Matching Mina's new speed
        
        console.log('Enhanced Sacha created successfully!');
    }
    
    createBlock(x, y, z, width, height, depth, color, transparent = false, opacity = 1, collidable = true, textureType = null) {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        
        let material;
        if (textureType) {
            // Create more realistic materials based on type
            switch(textureType) {
                case 'brick':
                    material = new THREE.MeshPhongMaterial({ 
                        color: color,
                        transparent: transparent,
                        opacity: opacity,
                        shininess: 10,
                        specular: 0x111111
                    });
                    break;
                case 'metal':
                    material = new THREE.MeshPhongMaterial({ 
                        color: color,
                        transparent: transparent,
                        opacity: opacity,
                        shininess: 100,
                        specular: 0x444444
                    });
                    break;
                case 'stone':
                    material = new THREE.MeshPhongMaterial({ 
                        color: color,
                        transparent: transparent,
                        opacity: opacity,
                        shininess: 5,
                        specular: 0x222222
                    });
                    break;
                default:
                    material = new THREE.MeshPhongMaterial({ 
                        color: color,
                        transparent: transparent,
                        opacity: opacity,
                        shininess: 30,
                        specular: 0x333333
                    });
            }
        } else {
            material = new THREE.MeshPhongMaterial({ 
                color: color,
                transparent: transparent,
                opacity: opacity,
                shininess: 30,
                specular: 0x333333
            });
        }
        
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(x, y, z);
        cube.castShadow = true;
        cube.receiveShadow = true;
        
        // Add collision box
        if (collidable) {
            cube.userData.boundingBox = new THREE.Box3().setFromObject(cube);
            cube.userData.collidable = true;
            this.collisionObjects.push(cube);
        }
        
        this.scene.add(cube);
        return cube;
    }
    
    createText(text, x, y, z, size = 2, color = 0xffffff) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = color === 0xffffff ? '#ffffff' : '#' + color.toString(16).padStart(6, '0');
        context.font = '48px Arial';
        context.textAlign = 'center';
        context.fillText(text, canvas.width / 2, canvas.height / 2 + 16);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
        const geometry = new THREE.PlaneGeometry(size * 4, size);
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);
        return mesh;
    }
    
    generateThemePark() {
        console.log('Generating Universal Studios Singapore...');
        
        this.createGround();
        this.createCentralLagoon();
        this.buildHollywoodZone();
        this.buildNewYorkZone();
        this.buildSciFiCityZone();
        this.buildAncientEgyptZone();
        this.buildLostWorldZone();
        this.buildFarFarAwayZone();
        this.createConnectingPathways();
        this.addUSSAtmosphere();
        
        console.log('Universal Studios Singapore generation complete!');
    }
    
    createGround() {
        // USS park ground (larger for all zones)
        const groundGeometry = new THREE.PlaneGeometry(600, 600);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    createCentralLagoon() {
        // Central lagoon - the heart of USS
        const lagoonGeometry = new THREE.CylinderGeometry(40, 40, 1);
        const lagoonMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4682B4, 
            transparent: true, 
            opacity: 0.8 
        });
        const lagoon = new THREE.Mesh(lagoonGeometry, lagoonMaterial);
        lagoon.position.set(0, 0.5, 0);
        lagoon.receiveShadow = true;
        this.scene.add(lagoon);
        
        // Lagoon fountain in center
        this.createBlock(0, 5, 0, 4, 10, 4, 0x696969);
        
        // Water effects around fountain
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = Math.cos(angle) * 15;
            const z = Math.sin(angle) * 15;
            this.createBlock(x, 2, z, 1, 4, 1, 0x87CEEB, true, 0.6);
        }
        
        console.log('Central lagoon created');
    }
    
    createPath(x, y, z, width, depth) {
        const pathGeometry = new THREE.PlaneGeometry(width, depth);
        const pathMaterial = new THREE.MeshLambertMaterial({ color: 0x696969 });
        const path = new THREE.Mesh(pathGeometry, pathMaterial);
        path.rotation.x = -Math.PI / 2;
        path.position.set(x, y, z);
        path.receiveShadow = true;
        this.scene.add(path);
    }
    
    buildHollywoodZone() {
        // Hollywood entrance zone - bottom of map (south)
        const zoneX = 0;
        const zoneZ = 120;
        
        // Hollywood entrance gates with metal texture
        this.createBlock(zoneX - 15, 10, zoneZ, 4, 20, 4, 0xFFD700, false, 1, true, 'metal');
        this.createBlock(zoneX + 15, 10, zoneZ, 4, 20, 4, 0xFFD700, false, 1, true, 'metal');
        this.createBlock(zoneX, 18, zoneZ, 30, 4, 4, 0xFFD700, false, 1, true, 'metal');
        
        // Universal Studios Singapore sign
        this.createText("UNIVERSAL STUDIOS", zoneX, 22, zoneZ, 2, 0xFF4500);
        this.createText("SINGAPORE", zoneX, 19, zoneZ, 1.5, 0xFF4500);
        
        // Ticket booths
        this.createBlock(zoneX - 25, 4, zoneZ - 10, 8, 8, 8, 0x4682B4);
        this.createBlock(zoneX + 25, 4, zoneZ - 10, 8, 8, 8, 0x4682B4);
        this.createText("TICKETS", zoneX - 25, 9, zoneZ - 10, 1);
        this.createText("TICKETS", zoneX + 25, 9, zoneZ - 10, 1);
        
        // Hollywood Boulevard
        this.createPath(zoneX, 0.1, zoneZ - 30, 20, 40);
        
        // Hollywood theater
        this.createBlock(zoneX - 30, 8, zoneZ - 40, 15, 16, 20, 0x8B0000);
        this.createText("PANTAGES", zoneX - 30, 18, zoneZ - 35, 1.5);
        
        console.log('Hollywood zone built');
    }
    
    buildNewYorkZone() {
        // New York zone - right side (east)
        const zoneX = 80;
        const zoneZ = 80;
        
        // New York skyline buildings
        this.createBlock(zoneX, 15, zoneZ, 12, 30, 12, 0x696969);
        this.createBlock(zoneX + 20, 20, zoneZ, 10, 40, 10, 0x2F4F4F);
        this.createBlock(zoneX - 20, 12, zoneZ + 15, 8, 24, 8, 0x708090);
        this.createBlock(zoneX + 15, 18, zoneZ - 20, 14, 36, 10, 0x4682B4);
        
        // Sesame Street area
        this.createBlock(zoneX - 15, 6, zoneZ - 30, 20, 12, 15, 0xFF6347);
        this.createText("SESAME STREET", zoneX - 15, 14, zoneZ - 25, 1.5, 0xFFFF00);
        
        // NYC streets with yellow taxi
        this.createBlock(zoneX + 10, 1, zoneZ + 25, 3, 2, 6, 0xFFFF00);
        
        console.log('New York zone built');
    }
    
    buildSciFiCityZone() {
        // Sci-Fi City - top right (northeast)
        const zoneX = 80;
        const zoneZ = -80;
        
        // Battlestar Galactica coasters (Human vs Cylon)
        // Human coaster (blue)
        for (let i = 0; i < 15; i++) {
            const height = 5 + i * 2;
            this.createBlock(zoneX - 20 + i * 4, height/2, zoneZ + 10, 1, height, 1, 0x0000FF);
            this.createBlock(zoneX - 20 + i * 4, height + 1, zoneZ + 10, 4, 0.5, 2, 0x4169E1);
        }
        
        // Cylon coaster (red)
        for (let i = 0; i < 15; i++) {
            const height = 5 + i * 2.2;
            this.createBlock(zoneX - 20 + i * 4, height/2, zoneZ - 10, 1, height, 1, 0xFF0000);
            this.createBlock(zoneX - 20 + i * 4, height + 1, zoneZ - 10, 4, 0.5, 2, 0x8B0000);
        }
        
        // Sci-Fi buildings
        this.createBlock(zoneX + 20, 12, zoneZ, 15, 24, 15, 0x2F2F2F);
        this.createBlock(zoneX - 30, 8, zoneZ + 30, 12, 16, 12, 0x1C1C1C);
        
        // Futuristic spires
        this.createBlock(zoneX, 25, zoneZ, 3, 50, 3, 0x00FFFF);
        this.createBlock(zoneX + 30, 20, zoneZ - 30, 2, 40, 2, 0xFF00FF);
        
        this.createText("BATTLESTAR GALACTICA", zoneX, 35, zoneZ + 40, 2, 0x00FFFF);
        
        console.log('Sci-Fi City zone built');
    }
    
    buildAncientEgyptZone() {
        // Ancient Egypt zone - left side (west)
        const zoneX = -80;
        const zoneZ = 0;
        
        // The Mummy ride - enhanced version
        const buildingWidth = 50;
        const buildingHeight = 30;
        const buildingDepth = 60;
        
        // Main pyramid-like building
        this.createBlock(zoneX, buildingHeight/2, zoneZ, buildingWidth, buildingHeight, buildingDepth, 0xDEB887);
        
        // Egyptian entrance with massive pillars
        this.createBlock(zoneX - 30, 15, zoneZ + 35, 6, 30, 6, 0xDAA520);
        this.createBlock(zoneX + 30, 15, zoneZ + 35, 6, 30, 6, 0xDAA520);
        
        // Entrance archway
        this.createBlock(zoneX, 25, zoneZ + 35, 36, 8, 6, 0xDAA520);
        
        // Sphinx statue
        this.createBlock(zoneX - 50, 8, zoneZ + 20, 12, 16, 25, 0xDEB887);
        this.createBlock(zoneX - 50, 12, zoneZ + 30, 8, 8, 8, 0xFFDBAC); // Head
        
        // Obelisks
        this.createBlock(zoneX + 40, 20, zoneZ + 40, 3, 40, 3, 0x8B4513);
        this.createBlock(zoneX - 40, 18, zoneZ + 50, 3, 36, 3, 0x8B4513);
        
        // The Mummy sign
        this.createText("THE MUMMY", zoneX, 35, zoneZ + 40, 3, 0xFFD700);
        this.createText("RETURNS", zoneX, 32, zoneZ + 40, 2, 0xFFD700);
        
        // Interior maze (enterable)
        this.createEgyptianMaze(zoneX, zoneZ);
        
        console.log('Ancient Egypt zone built');
    }
    
    createEgyptianMaze(centerX, centerZ) {
        // Create maze-like interior in the Mummy attraction
        // Outer walls
        this.createBlock(centerX, 8, centerZ - 25, 45, 16, 3, 0x8B4513); // Back wall
        this.createBlock(centerX + 22, 8, centerZ, 3, 16, 50, 0x8B4513); // Right wall
        this.createBlock(centerX - 22, 8, centerZ, 3, 16, 50, 0x8B4513); // Left wall
        
        // Interior maze walls
        this.createBlock(centerX - 10, 8, centerZ - 10, 20, 16, 3, 0x8B4513);
        this.createBlock(centerX + 10, 8, centerZ + 5, 20, 16, 3, 0x8B4513);
        this.createBlock(centerX - 5, 8, centerZ + 15, 3, 16, 15, 0x8B4513);
        this.createBlock(centerX + 15, 8, centerZ - 15, 3, 16, 12, 0x8B4513);
        
        // Sarcophagi in maze
        this.createBlock(centerX - 15, 3, centerZ - 5, 4, 6, 8, 0xDAA520);
        this.createBlock(centerX + 8, 3, centerZ + 8, 4, 6, 8, 0xDAA520);
        this.createBlock(centerX, 3, centerZ - 20, 4, 6, 8, 0xDAA520);
    }
    
    buildLostWorldZone() {
        // The Lost World zone - top left (northwest)
        const zoneX = -80;
        const zoneZ = -80;
        
        // Jurassic Park section
        // Large Jurassic Park gates
        this.createBlock(zoneX - 10, 15, zoneZ + 40, 6, 30, 6, 0x8B4513);
        this.createBlock(zoneX + 10, 15, zoneZ + 40, 6, 30, 6, 0x8B4513);
        this.createBlock(zoneX, 22, zoneZ + 40, 20, 6, 6, 0x8B4513);
        this.createText("JURASSIC PARK", zoneX, 26, zoneZ + 40, 2, 0xFFFF00);
        
        // Jurassic Park Rapids ride building
        this.createBlock(zoneX, 10, zoneZ, 25, 20, 30, 0x228B22);
        
        // Water channel for rapids
        this.createPath(zoneX - 15, 0.2, zoneZ + 20, 8, 40);
        for (let i = 0; i < 10; i++) {
            this.createBlock(zoneX - 15 + i * 3, 1, zoneZ + 20, 2, 2, 2, 0x4682B4, true, 0.8);
        }
        
        // Dinosaur statues
        this.createBlock(zoneX + 30, 8, zoneZ + 20, 6, 16, 12, 0x228B22); // T-Rex
        this.createBlock(zoneX + 30, 12, zoneZ + 26, 4, 4, 8, 0x228B22); // T-Rex head
        this.createBlock(zoneX - 30, 6, zoneZ - 20, 8, 12, 15, 0x32CD32); // Triceratops
        
        // Waterworld amphitheater
        this.createBlock(zoneX + 20, 5, zoneZ - 40, 30, 10, 20, 0x2F4F4F);
        this.createText("WATERWORLD", zoneX + 20, 12, zoneZ - 35, 2, 0x00FFFF);
        
        // Prehistoric jungle
        for (let i = 0; i < 8; i++) {
            const treeX = zoneX + (Math.random() - 0.5) * 60;
            const treeZ = zoneZ + (Math.random() - 0.5) * 60;
            this.createBlock(treeX, 12, treeZ, 4, 24, 4, 0x8B4513);
            this.createBlock(treeX, 20, treeZ, 12, 8, 12, 0x228B22, true, 0.8);
        }
        
        console.log('The Lost World zone built');
    }
    
    buildFarFarAwayZone() {
        // Far Far Away zone - bottom left (southwest)
        const zoneX = -80;
        const zoneZ = 80;
        
        // Shrek's Castle (iconic landmark)
        this.createBlock(zoneX, 20, zoneZ, 20, 40, 20, 0x90EE90);
        
        // Castle towers
        this.createBlock(zoneX - 12, 25, zoneZ - 12, 6, 50, 6, 0x90EE90);
        this.createBlock(zoneX + 12, 25, zoneZ - 12, 6, 50, 6, 0x90EE90);
        this.createBlock(zoneX - 12, 25, zoneZ + 12, 6, 50, 6, 0x90EE90);
        this.createBlock(zoneX + 12, 25, zoneZ + 12, 6, 50, 6, 0x90EE90);
        
        // Tower roofs
        this.createBlock(zoneX - 12, 55, zoneZ - 12, 8, 10, 8, 0xFF6347);
        this.createBlock(zoneX + 12, 55, zoneZ - 12, 8, 10, 8, 0xFF6347);
        this.createBlock(zoneX - 12, 55, zoneZ + 12, 8, 10, 8, 0xFF6347);
        this.createBlock(zoneX + 12, 55, zoneZ + 12, 8, 10, 8, 0xFF6347);
        
        // Main castle roof
        this.createBlock(zoneX, 45, zoneZ, 25, 10, 25, 0xFF6347);
        
        // Castle bridge
        this.createBlock(zoneX, 5, zoneZ + 25, 15, 2, 10, 0x8B4513);
        
        // Puss in Boots ride
        this.createBlock(zoneX - 40, 8, zoneZ + 20, 12, 16, 15, 0xFFD700);
        this.createText("PUSS IN BOOTS", zoneX - 40, 18, zoneZ + 25, 1.5, 0xFF4500);
        
        // Magic Potion Spin ride
        this.createBlock(zoneX + 30, 6, zoneZ + 30, 10, 12, 10, 0x9932CC);
        this.createText("MAGIC POTION SPIN", zoneX + 30, 14, zoneZ + 35, 1.2, 0xFFFF00);
        
        // Enchanted Airways coaster
        for (let i = 0; i < 12; i++) {
            const height = 4 + Math.sin(i * 0.5) * 6 + 5;
            this.createBlock(zoneX - 30 + i * 4, height/2, zoneZ - 20, 1, height, 1, 0xFFB6C1);
            this.createBlock(zoneX - 30 + i * 4, height + 1, zoneZ - 20, 3, 0.5, 2, 0xFF69B4);
        }
        
        this.createText("FAR FAR AWAY", zoneX, 65, zoneZ, 3, 0xFFD700);
        
        console.log('Far Far Away zone built');
    }
    
    createConnectingPathways() {
        // Main circular pathway around the lagoon
        const lagoonRadius = 50;
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
            const x = Math.cos(angle) * lagoonRadius;
            const z = Math.sin(angle) * lagoonRadius;
            this.createPath(x, 0.05, z, 8, 8);
        }
        
        // Pathways from lagoon to each zone
        // To Hollywood (south)
        this.createPath(0, 0.05, 80, 12, 40);
        
        // To New York (east)  
        this.createPath(50, 0.05, 40, 40, 12);
        
        // To Sci-Fi City (northeast)
        this.createPath(50, 0.05, -40, 40, 12);
        
        // To Ancient Egypt (west)
        this.createPath(-50, 0.05, 0, 40, 12);
        
        // To Lost World (northwest)
        this.createPath(-50, 0.05, -40, 40, 12);
        
        // To Far Far Away (southwest)
        this.createPath(-50, 0.05, 40, 40, 12);
        
        console.log('Connecting pathways created');
    }
    
    addUSSAtmosphere() {
        // Decorative elements around the park
        
        // Street lamps along pathways
        const lampPositions = [
            [30, 60], [-30, 60], [60, 30], [60, -30], 
            [-60, 30], [-60, -30], [30, -60], [-30, -60]
        ];
        
        lampPositions.forEach(pos => {
            this.createBlock(pos[0], 4, pos[1], 0.5, 8, 0.5, 0x2F2F2F);
            this.createBlock(pos[0], 8, pos[1], 1.5, 1, 1.5, 0xFFFF00, true, 0.8);
        });
        
        // Themed decorative trees around each zone
        this.addZoneSpecificDecoration();
        
        console.log('USS atmosphere added');
    }
    
    addZoneSpecificDecoration() {
        // Hollywood palm trees
        for (let i = 0; i < 4; i++) {
            const x = -20 + i * 10;
            this.createPalmTree(x, 100);
        }
        
        // Ancient Egypt sand dunes
        for (let i = 0; i < 6; i++) {
            const x = -120 + Math.random() * 80;
            const z = -30 + Math.random() * 60;
            this.createBlock(x, 1, z, 8 + Math.random() * 4, 2, 8 + Math.random() * 4, 0xDEB887, true, 0.9);
        }
        
        // Far Far Away fairy tale mushrooms
        for (let i = 0; i < 5; i++) {
            const x = -100 + Math.random() * 40;
            const z = 60 + Math.random() * 40;
            this.createBlock(x, 2, z, 1, 4, 1, 0xF5DEB3);
            this.createBlock(x, 5, z, 3, 1, 3, 0xFF0000, true, 0.8);
        }
    }
    
    createPalmTree(x, z) {
        // Palm tree trunk
        this.createBlock(x, 8, z, 1, 16, 1, 0x8B4513);
        
        // Palm fronds
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const frondX = x + Math.cos(angle) * 4;
            const frondZ = z + Math.sin(angle) * 4;
            this.createBlock(frondX, 15, frondZ, 0.5, 6, 0.5, 0x228B22);
        }
    }
    
    createSpookyTree(x, z) {
        // Dark tree trunk
        this.createBlock(x, 6, z, 2, 12, 2, 0x2f2f2f);
        
        // Dark foliage
        this.createBlock(x, 12, z, 10, 4, 10, 0x1a4d1a, true, 0.8);
        this.createBlock(x, 15, z, 8, 4, 8, 0x1a4d1a, true, 0.8);
        this.createBlock(x, 18, z, 6, 4, 6, 0x1a4d1a, true, 0.8);
    }
    
    createNPCs() {
        // Create various NPCs throughout the park
        const npcLocations = [
            // Hollywood zone visitors
            { x: -10, z: 90, type: 'family' },
            { x: 15, z: 95, type: 'couple' },
            { x: -5, z: 85, type: 'child' },
            
            // Around lagoon
            { x: 30, z: 30, type: 'tourist' },
            { x: -25, z: 25, type: 'photographer' },
            { x: 20, z: -20, type: 'family' },
            { x: -30, z: -30, type: 'couple' },
            
            // Zone-specific NPCs
            { x: -60, z: 10, type: 'archaeologist' }, // Ancient Egypt
            { x: -70, z: 70, type: 'fairy' },        // Far Far Away
            { x: 70, z: -70, type: 'robot' },        // Sci-Fi City
            { x: -70, z: -50, type: 'explorer' },    // Lost World
            { x: 60, z: 60, type: 'reporter' },      // New York
            
            // Staff members
            { x: 0, z: 50, type: 'staff' },          // Near entrance
            { x: -40, z: 0, type: 'security' },     // Near Egypt
            { x: 40, z: 0, type: 'maintenance' }    // Near coaster
        ];
        
        npcLocations.forEach((npcData, index) => {
            const npc = this.createNPC(npcData.x, npcData.z, npcData.type);
            npc.userData.id = index;
            npc.userData.type = npcData.type;
            npc.userData.walkSpeed = 1 + Math.random() * 2;
            npc.userData.targetPosition = new THREE.Vector3(npcData.x, 1.35, npcData.z);
            npc.userData.wanderRadius = 10 + Math.random() * 15;
            npc.userData.lastDirectionChange = 0;
            this.npcs.push(npc);
        });
        
        console.log(`Created ${this.npcs.length} NPCs`);
    }
    
    createNPC(x, z, type) {
        const npcGroup = new THREE.Group();
        
        // Base colors and characteristics for different NPC types
        const npcTypes = {
            family: { bodyColor: 0x4169e1, headColor: 0xffdbac, height: 1.6 },
            couple: { bodyColor: 0xff69b4, headColor: 0xffdbac, height: 1.7 },
            child: { bodyColor: 0x32cd32, headColor: 0xffdbac, height: 1.2 },
            tourist: { bodyColor: 0xffd700, headColor: 0xffdbac, height: 1.65 },
            photographer: { bodyColor: 0x8b4513, headColor: 0xffdbac, height: 1.6 },
            archaeologist: { bodyColor: 0xdeb887, headColor: 0xd2691e, height: 1.65 },
            fairy: { bodyColor: 0xff1493, headColor: 0xffdbac, height: 1.5 },
            robot: { bodyColor: 0x2f4f4f, headColor: 0x696969, height: 1.8 },
            explorer: { bodyColor: 0x228b22, headColor: 0xd2691e, height: 1.7 },
            reporter: { bodyColor: 0x4682b4, headColor: 0xffdbac, height: 1.65 },
            staff: { bodyColor: 0xff4500, headColor: 0xffdbac, height: 1.6 },
            security: { bodyColor: 0x000080, headColor: 0xffdbac, height: 1.75 },
            maintenance: { bodyColor: 0x708090, headColor: 0xffdbac, height: 1.65 }
        };
        
        const npcData = npcTypes[type] || npcTypes.tourist;
        const scale = npcData.height / 1.6; // Scale relative to standard height
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.3 * scale, 0.5 * scale, 0.15 * scale);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: npcData.bodyColor,
            shininess: 10,
            specular: 0x333333
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.25 * scale;
        body.castShadow = true;
        npcGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.12 * scale, 12, 8);
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: npcData.headColor,
            shininess: 20,
            specular: 0x333333
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.62 * scale;
        head.castShadow = true;
        npcGroup.add(head);
        
        // Hair (random color)
        const hairColors = [0x8b4513, 0x000000, 0xffff80, 0xff8c00, 0x696969];
        const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
        const hairGeometry = new THREE.SphereGeometry(0.14 * scale, 8, 6);
        const hairMaterial = new THREE.MeshPhongMaterial({ 
            color: hairColor,
            shininess: 50,
            specular: 0x444444
        });
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = 0.68 * scale;
        hair.castShadow = true;
        npcGroup.add(hair);
        
        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.04 * scale, 0.03 * scale, 0.25 * scale, 6);
        const armMaterial = new THREE.MeshPhongMaterial({ 
            color: npcData.headColor,
            shininess: 20,
            specular: 0x333333
        });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.2 * scale, 0.3 * scale, 0);
        leftArm.castShadow = true;
        npcGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.2 * scale, 0.3 * scale, 0);
        rightArm.castShadow = true;
        npcGroup.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.05 * scale, 0.04 * scale, 0.3 * scale, 6);
        const legMaterial = new THREE.MeshPhongMaterial({ 
            color: Math.random() > 0.5 ? 0x4169e1 : 0x8b4513, // Random pants color
            shininess: 5,
            specular: 0x222222
        });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.08 * scale, -0.15 * scale, 0);
        leftLeg.castShadow = true;
        npcGroup.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.08 * scale, -0.15 * scale, 0);
        rightLeg.castShadow = true;
        npcGroup.add(rightLeg);
        
        // Special accessories for certain types
        if (type === 'photographer') {
            // Camera
            const cameraGeometry = new THREE.BoxGeometry(0.1, 0.06, 0.08);
            const cameraMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
            const camera = new THREE.Mesh(cameraGeometry, cameraMaterial);
            camera.position.set(0.15 * scale, 0.4 * scale, 0.1 * scale);
            npcGroup.add(camera);
        } else if (type === 'security') {
            // Hat
            const hatGeometry = new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 0.03 * scale);
            const hatMaterial = new THREE.MeshPhongMaterial({ color: 0x000080 });
            const hat = new THREE.Mesh(hatGeometry, hatMaterial);
            hat.position.y = 0.75 * scale;
            npcGroup.add(hat);
        } else if (type === 'fairy') {
            // Wings
            const wingGeometry = new THREE.PlaneGeometry(0.2 * scale, 0.3 * scale);
            const wingMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffffff, 
                transparent: true, 
                opacity: 0.7 
            });
            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
            leftWing.position.set(-0.15 * scale, 0.4 * scale, -0.1 * scale);
            leftWing.rotation.y = -0.3;
            npcGroup.add(leftWing);
            
            const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
            rightWing.position.set(0.15 * scale, 0.4 * scale, -0.1 * scale);
            rightWing.rotation.y = 0.3;
            npcGroup.add(rightWing);
        }
        
        npcGroup.position.set(x, 1.35 * scale - 0.35, z);
        this.scene.add(npcGroup);
        
        return npcGroup;
    }
    
    updateNPCs(deltaTime) {
        this.npcs.forEach(npc => {
            const time = this.clock.getElapsedTime();
            
            // Simple wandering behavior
            if (time - npc.userData.lastDirectionChange > 3 + Math.random() * 4) {
                // Change direction
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * npc.userData.wanderRadius;
                npc.userData.targetPosition.set(
                    npc.position.x + Math.cos(angle) * distance,
                    npc.position.y,
                    npc.position.z + Math.sin(angle) * distance
                );
                npc.userData.lastDirectionChange = time;
            }
            
            // Move towards target
            const direction = new THREE.Vector3()
                .subVectors(npc.userData.targetPosition, npc.position);
            
            if (direction.length() > 0.5) {
                direction.normalize();
                const movement = direction.multiplyScalar(npc.userData.walkSpeed * deltaTime);
                npc.position.add(movement);
                npc.lookAt(npc.userData.targetPosition);
                
                // Simple walking animation
                npc.position.y = npc.userData.baseY || npc.position.y;
                npc.position.y += Math.sin(time * 8 + npc.userData.id) * 0.02;
                
                // Animate limbs
                if (npc.children.length > 4) {
                    const leftArm = npc.children.find(child => child.position.x < -0.1);
                    const rightArm = npc.children.find(child => child.position.x > 0.1);
                    if (leftArm) leftArm.rotation.x = Math.sin(time * 4 + npc.userData.id) * 0.3;
                    if (rightArm) rightArm.rotation.x = -Math.sin(time * 4 + npc.userData.id) * 0.3;
                }
            }
        });
    }
    
    addParticleEffects() {
        // Create floating particles around the lagoon (magical atmosphere)
        const lagoonParticles = this.createParticleSystem(0, 5, 0, 30, 0x87ceeb, 50);
        
        // Ancient Egypt - dust particles
        const dustParticles = this.createParticleSystem(-80, 3, 0, 20, 0xdeb887, 30);
        
        // Far Far Away - magical sparkles
        const sparkles = this.createParticleSystem(-80, 10, 80, 15, 0xff69b4, 40);
        
        // Sci-Fi City - energy particles
        const energyParticles = this.createParticleSystem(80, 8, -80, 25, 0x00ffff, 35);
        
        console.log('Particle effects added');
    }
    
    createParticleSystem(x, y, z, radius, color, count) {
        const particles = new THREE.Group();
        
        for (let i = 0; i < count; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.05 + Math.random() * 0.05, 4, 3);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: color,
                transparent: true,
                opacity: 0.3 + Math.random() * 0.4
            });
            
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            
            // Random position within radius
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            particle.position.set(
                x + Math.cos(angle) * distance,
                y + Math.random() * 10,
                z + Math.sin(angle) * distance
            );
            
            // Store animation data
            particle.userData = {
                baseY: particle.position.y,
                speed: 0.5 + Math.random() * 1.5,
                amplitude: 1 + Math.random() * 2,
                phase: Math.random() * Math.PI * 2
            };
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        
        // Add to update list for animation
        if (!this.particleSystems) this.particleSystems = [];
        this.particleSystems.push(particles);
        
        return particles;
    }
    
    updateParticleEffects() {
        if (!this.particleSystems) return;
        
        const time = this.clock.getElapsedTime();
        
        this.particleSystems.forEach(system => {
            system.children.forEach(particle => {
                // Floating animation
                particle.position.y = particle.userData.baseY + 
                    Math.sin(time * particle.userData.speed + particle.userData.phase) * particle.userData.amplitude;
                
                // Gentle rotation
                particle.rotation.y += 0.01;
                particle.rotation.x += 0.005;
                
                // Subtle horizontal drift
                particle.position.x += Math.sin(time * 0.5 + particle.userData.phase) * 0.01;
                particle.position.z += Math.cos(time * 0.5 + particle.userData.phase) * 0.01;
            });
        });
    }
    
    placeTreasures() {
        const treasureLocations = [
            { x: -80, y: 3, z: -10 }, // Inside Mummy maze (Ancient Egypt)
            { x: -80, y: 3, z: 60 },  // Shrek's Castle (Far Far Away)
            { x: 80, y: 30, z: -80 }, // Top of Battlestar Galactica (Sci-Fi City)
            { x: -80, y: 3, z: -60 }, // Jurassic Park (Lost World)
            { x: 80, y: 3, z: 70 }    // New York zone
        ];
        
        treasureLocations.forEach((loc, index) => {
            const treasure = this.createTreasure(loc.x, loc.y, loc.z);
            treasure.userData = { id: index, collected: false };
            this.treasures.push(treasure);
        });
        
        console.log('Placed 5 treasures around the park');
    }
    
    createTreasure(x, y, z) {
        // Golden treasure chest
        const chestGeometry = new THREE.BoxGeometry(1, 0.8, 1.2);
        const chestMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffd700,
            emissive: 0x332200
        });
        const chest = new THREE.Mesh(chestGeometry, chestMaterial);
        chest.position.set(x, y, z);
        chest.castShadow = true;
        
        // Add glowing effect
        const glowGeometry = new THREE.SphereGeometry(1.5);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff00, 
            transparent: true, 
            opacity: 0.2 
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(chest.position);
        
        this.scene.add(chest);
        this.scene.add(glow);
        
        return chest;
    }
    
    spawnMonsters() {
        const monsterSpawnPoints = [
            { x: -70, z: 10 },   // Ancient Egypt zone
            { x: -70, z: -70 },  // Lost World zone  
            { x: 70, z: -70 },   // Sci-Fi City zone
            { x: 70, z: 70 },    // New York zone
            { x: -70, z: 70 }    // Far Far Away zone
        ];
        
        monsterSpawnPoints.forEach((spawn, index) => {
            const monster = this.createMummyMonster(spawn.x, spawn.z);
            monster.userData = { 
                id: index, 
                targetPosition: new THREE.Vector3(),
                speed: 3 + Math.random() * 2,
                detectionRadius: 15,
                chasing: false
            };
            this.monsters.push(monster);
        });
        
        console.log('Spawned 5 mummy monsters');
    }
    
    createMummyMonster(x, z) {
        const monsterGroup = new THREE.Group();
        
        // MUCH larger and scarier mummy body
        const bodyGeometry = new THREE.BoxGeometry(1.2, 2.5, 0.6);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8b7355,  // Darker, dirtier mummy wrap
            transparent: true,
            opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.25;
        body.castShadow = true;
        monsterGroup.add(body);
        
        // Add tattered wrap details
        for (let i = 0; i < 8; i++) {
            const wrapGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.05);
            const wrapMaterial = new THREE.MeshLambertMaterial({ 
                color: 0x696969,
                transparent: true,
                opacity: 0.7
            });
            const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
            wrap.position.set(
                (Math.random() - 0.5) * 1.2,
                0.5 + Math.random() * 1.5,
                0.35 + Math.random() * 0.2
            );
            wrap.rotation.set(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 0.5
            );
            monsterGroup.add(wrap);
        }
        
        // Larger, scarier head
        const headGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.6);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 3.2;
        head.castShadow = true;
        monsterGroup.add(head);
        
        // MUCH larger glowing red eyes
        const eyeGeometry = new THREE.SphereGeometry(0.12);
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            emissive: 0xff0000,
            transparent: true,
            opacity: 0.9
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 3.3, 0.3);
        monsterGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 3.3, 0.3);
        monsterGroup.add(rightEye);
        
        // Add glowing eye effect
        const glowGeometry = new THREE.SphereGeometry(0.18);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff4444,
            transparent: true,
            opacity: 0.3
        });
        
        const leftGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        leftGlow.position.set(-0.2, 3.3, 0.3);
        monsterGroup.add(leftGlow);
        
        const rightGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        rightGlow.position.set(0.2, 3.3, 0.3);
        monsterGroup.add(rightGlow);
        
        // Longer, scarier arms
        const armGeometry = new THREE.BoxGeometry(0.3, 1.8, 0.25);
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.position.set(-0.8, 1.8, 0);
        leftArm.rotation.z = 0.3; // Reaching pose
        leftArm.castShadow = true;
        monsterGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.position.set(0.8, 1.8, 0);
        rightArm.rotation.z = -0.3; // Reaching pose
        rightArm.castShadow = true;
        monsterGroup.add(rightArm);
        
        // Add clawed hands
        const clawGeometry = new THREE.ConeGeometry(0.05, 0.2, 6);
        const clawMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
        
        for (let arm = 0; arm < 2; arm++) {
            for (let claw = 0; claw < 5; claw++) {
                const clawMesh = new THREE.Mesh(clawGeometry, clawMaterial);
                clawMesh.position.set(
                    arm === 0 ? -1.1 : 1.1,
                    0.9,
                    0.1 + (claw - 2) * 0.05
                );
                clawMesh.rotation.x = Math.PI;
                clawMesh.rotation.z = (arm === 0 ? 0.3 : -0.3) + (claw - 2) * 0.1;
                monsterGroup.add(clawMesh);
            }
        }
        
        // Make monster much taller and more imposing
        monsterGroup.scale.set(2, 2, 2); // 2x larger than before
        monsterGroup.position.set(x, 0, z);
        this.scene.add(monsterGroup);
        
        return monsterGroup;
    }
    
    setupEventListeners() {
        document.addEventListener('click', () => {
            if (!this.mouseLocked) {
                this.renderer.domElement.requestPointerLock();
            }
        });
        
        document.addEventListener('pointerlockchange', () => {
            this.mouseLocked = document.pointerLockElement === this.renderer.domElement;
            console.log('Mouse lock changed:', this.mouseLocked);
        });
        
        document.addEventListener('mousemove', (event) => {
            if (!this.mouseLocked) return;
            
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;
            
            // Store camera rotation angles
            if (!this.cameraRotation) {
                this.cameraRotation = { horizontal: 0, vertical: 0 };
            }
            
            // Update camera rotation
            this.cameraRotation.horizontal -= movementX * 0.002;
            this.cameraRotation.vertical -= movementY * 0.002;
            
            // Clamp vertical rotation
            this.cameraRotation.vertical = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.cameraRotation.vertical));
        });
        
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'KeyW':
                    this.controls.forward = true;
                    break;
                case 'KeyS':
                    this.controls.backward = true;
                    break;
                case 'KeyA':
                    this.controls.left = true;
                    break;
                case 'KeyD':
                    this.controls.right = true;
                    break;
                case 'ShiftLeft':
                    this.controls.run = true;
                    break;
            }
        });
        
        document.addEventListener('keyup', (event) => {
            switch(event.code) {
                case 'KeyW':
                    this.controls.forward = false;
                    break;
                case 'KeyS':
                    this.controls.backward = false;
                    break;
                case 'KeyA':
                    this.controls.left = false;
                    break;
                case 'KeyD':
                    this.controls.right = false;
                    break;
                case 'ShiftLeft':
                    this.controls.run = false;
                    break;
            }
        });
        
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Mobile touch controls
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }
    
    setupMobileControls() {
        const joystick = document.getElementById('movementJoystick');
        const joystickHandle = document.getElementById('joystickHandle');
        const runButton = document.getElementById('runButton');
        const cameraButton = document.getElementById('cameraButton');
        
        if (!joystick || !joystickHandle) {
            console.log('Mobile controls elements not found');
            return;
        }
        
        let joystickCenter = { x: 0, y: 0 };
        let isDragging = false;
        let startTouch = null;
        
        console.log('Setting up mobile joystick controls');
        
        // Calculate joystick center
        const updateJoystickCenter = () => {
            const rect = joystick.getBoundingClientRect();
            joystickCenter.x = rect.left + rect.width / 2;
            joystickCenter.y = rect.top + rect.height / 2;
            console.log('Joystick center:', joystickCenter);
        };
        
        // Improved touch handling for mobile
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = true;
            startTouch = e.touches[0];
            updateJoystickCenter();
            this.mobileControls.joystick.active = true;
            
            console.log('Touch start on joystick');
            
            // Visual feedback
            joystick.style.backgroundColor = 'rgba(255,255,255,0.3)';
        }, { passive: false });
        
        // Handle touch move on the joystick itself
        joystick.addEventListener('touchmove', (e) => {
            if (!isDragging || !startTouch) return;
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - joystickCenter.x;
            const deltaY = touch.clientY - joystickCenter.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const maxDistance = 50; // Increased for easier control
            
            console.log('Touch move:', { deltaX, deltaY, distance });
            
            let finalX, finalY;
            if (distance <= maxDistance) {
                finalX = deltaX;
                finalY = deltaY;
                this.mobileControls.joystick.x = deltaX / maxDistance;
                this.mobileControls.joystick.y = deltaY / maxDistance;
            } else {
                const angle = Math.atan2(deltaY, deltaX);
                finalX = Math.cos(angle) * maxDistance;
                finalY = Math.sin(angle) * maxDistance;
                this.mobileControls.joystick.x = finalX / maxDistance;
                this.mobileControls.joystick.y = finalY / maxDistance;
            }
            
            joystickHandle.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;
            
            // Convert joystick to movement controls with lower threshold
            const threshold = 0.2;
            this.controls.forward = this.mobileControls.joystick.y < -threshold;
            this.controls.backward = this.mobileControls.joystick.y > threshold;
            this.controls.left = this.mobileControls.joystick.x < -threshold;
            this.controls.right = this.mobileControls.joystick.x > threshold;
            
            console.log('Controls:', this.controls);
        }, { passive: false });
        
        // Touch end
        const handleTouchEnd = (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            startTouch = null;
            this.mobileControls.joystick.active = false;
            this.mobileControls.joystick.x = 0;
            this.mobileControls.joystick.y = 0;
            joystickHandle.style.transform = 'translate(-50%, -50%)';
            
            // Reset visual feedback
            joystick.style.backgroundColor = 'rgba(0,0,0,0.3)';
            
            // Reset movement controls
            this.controls.forward = false;
            this.controls.backward = false;
            this.controls.left = false;
            this.controls.right = false;
            
            console.log('Touch ended, controls reset');
        };
        
        joystick.addEventListener('touchend', handleTouchEnd, { passive: false });
        joystick.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        
        // Prevent scrolling when touching joystick area
        document.addEventListener('touchmove', (e) => {
            if (isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Run button
        if (runButton) {
            runButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.controls.run = true;
                this.mobileControls.run = true;
            });
            
            runButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.controls.run = false;
                this.mobileControls.run = false;
            });
        }
        
        // Camera button for mobile camera controls
        if (cameraButton) {
            cameraButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.mobileControls.cameraMode = !this.mobileControls.cameraMode;
                cameraButton.style.background = this.mobileControls.cameraMode ? 
                    'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)';
            });
        }
        
        // Touch camera controls
        let lastTouchX = 0, lastTouchY = 0;
        this.renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1 && this.mobileControls.cameraMode) {
                lastTouchX = e.touches[0].clientX;
                lastTouchY = e.touches[0].clientY;
            }
        });
        
        this.renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.mobileControls.cameraMode) {
                e.preventDefault();
                const touch = e.touches[0];
                const deltaX = touch.clientX - lastTouchX;
                const deltaY = touch.clientY - lastTouchY;
                
                // Update camera rotation
                if (!this.cameraRotation) {
                    this.cameraRotation = { horizontal: 0, vertical: 0 };
                }
                
                this.cameraRotation.horizontal -= deltaX * 0.005;
                this.cameraRotation.vertical -= deltaY * 0.005;
                this.cameraRotation.vertical = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.cameraRotation.vertical));
                
                lastTouchX = touch.clientX;
                lastTouchY = touch.clientY;
            }
        });
        
        console.log('Mobile touch controls initialized');
    }
    
    createSpeechBubble(speaker, text) {
        // Remove existing bubble
        if (this.speechSystem.currentBubble) {
            this.removeSpeechBubble();
        }
        
        // Create new bubble
        const bubble = document.createElement('div');
        bubble.className = `speech-bubble ${speaker}`;
        bubble.textContent = text;
        bubble.style.display = 'none'; // Initially hidden for positioning
        
        document.body.appendChild(bubble);
        this.speechSystem.currentBubble = bubble;
        
        // Position the bubble above the speaking character
        this.updateSpeechBubblePosition(speaker, bubble);
        
        // Show bubble with animation
        bubble.style.display = 'block';
        
        // Auto-remove after 6 seconds
        setTimeout(() => {
            if (this.speechSystem.currentBubble === bubble) {
                this.removeSpeechBubble();
            }
        }, 6000);
    }
    
    updateSpeechBubblePosition(speaker, bubble) {
        if (!bubble) return;
        
        // Get the speaking character
        const character = speaker === 'mina' ? this.mina : this.sacha;
        if (!character) return;
        
        // Project 3D position to 2D screen coordinates
        const characterPosition = character.position.clone();
        characterPosition.y += 8; // Above character's head
        
        const screenPosition = characterPosition.clone();
        screenPosition.project(this.camera);
        
        // Convert to screen coordinates
        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (screenPosition.y * -0.5 + 0.5) * window.innerHeight;
        
        // Position bubble, ensuring it stays on screen
        const bubbleRect = bubble.getBoundingClientRect();
        const finalX = Math.max(10, Math.min(x - bubbleRect.width / 2, window.innerWidth - bubbleRect.width - 10));
        const finalY = Math.max(10, y - bubbleRect.height - 20);
        
        bubble.style.left = finalX + 'px';
        bubble.style.top = finalY + 'px';
    }
    
    removeSpeechBubble() {
        if (this.speechSystem.currentBubble) {
            this.speechSystem.currentBubble.classList.add('fade-out');
            const bubbleToRemove = this.speechSystem.currentBubble;
            setTimeout(() => {
                if (bubbleToRemove.parentNode) {
                    bubbleToRemove.parentNode.removeChild(bubbleToRemove);
                }
            }, 500);
            this.speechSystem.currentBubble = null;
        }
    }
    
    updateSpeechSystem() {
        const currentTime = Date.now();
        
        // Update bubble position if one exists
        if (this.speechSystem.currentBubble) {
            const speaker = this.speechSystem.currentBubble.classList.contains('mina') ? 'mina' : 'sacha';
            this.updateSpeechBubblePosition(speaker, this.speechSystem.currentBubble);
        }
        
        // Check if it's time for a new dialogue
        if (currentTime - this.speechSystem.lastSpeechTime > this.speechSystem.speechInterval) {
            if (!this.speechSystem.currentBubble && this.mina && this.sacha) {
                const dialogue = this.speechSystem.dialogues[this.speechSystem.nextDialogueIndex];
                this.createSpeechBubble(dialogue.speaker, dialogue.text);
                
                this.speechSystem.lastSpeechTime = currentTime;
                this.speechSystem.nextDialogueIndex = (this.speechSystem.nextDialogueIndex + 1) % this.speechSystem.dialogues.length;
            }
        }
    }
    
    checkCollision(newPosition) {
        // Create a bounding box for Mina at the new position
        const minaBox = new THREE.Box3();
        const minaBounds = new THREE.Vector3(0.5, 1.8, 0.5); // Mina's collision bounds
        minaBox.setFromCenterAndSize(newPosition, minaBounds);
        
        // Check collision with all collidable objects
        for (let obj of this.collisionObjects) {
            if (obj.userData.boundingBox) {
                // Update the object's bounding box
                obj.userData.boundingBox.setFromObject(obj);
                
                if (minaBox.intersectsBox(obj.userData.boundingBox)) {
                    return true; // Collision detected
                }
            }
        }
        return false; // No collision
    }
    
    updateMinaMovement(deltaTime) {
        // Safety check - ensure Mina exists
        if (!this.mina) {
            console.warn('updateMinaMovement called but Mina does not exist');
            return;
        }
        
        const speed = this.controls.run ? this.minaSpeed * 1.5 : this.minaSpeed;
        const direction = new THREE.Vector3();
        
        if (this.controls.forward) direction.z -= 1;
        if (this.controls.backward) direction.z += 1;
        if (this.controls.left) direction.x -= 1;
        if (this.controls.right) direction.x += 1;
        
        // Light debug logging (movement confirmed working)
        const anyKeyPressed = this.controls.forward || this.controls.backward || this.controls.left || this.controls.right;
        if (anyKeyPressed && Math.random() < 0.1) { // Only log occasionally
            console.log('Moving:', direction);
        }
        
        if (direction.length() > 0) {
            direction.normalize();
            
            // Calculate potential new position
            const movement = direction.multiplyScalar(speed * deltaTime);
            const newPosition = this.mina.position.clone().add(movement);
            
            // Re-enable collision detection now that movement works
            if (!this.checkCollision(newPosition)) {
                this.mina.position.copy(newPosition);
                
                // Rotate Mina to face movement direction
                if (movement.length() > 0) {
                    this.mina.lookAt(this.mina.position.clone().add(movement));
                }
            } else {
                // Try sliding along walls
                const xOnlyMovement = new THREE.Vector3(movement.x, 0, 0);
                const xOnlyPosition = this.mina.position.clone().add(xOnlyMovement);
                if (!this.checkCollision(xOnlyPosition)) {
                    this.mina.position.copy(xOnlyPosition);
                    if (movement.x !== 0) this.mina.lookAt(this.mina.position.clone().add(xOnlyMovement));
                } else {
                    // Try moving in just Z direction
                    const zOnlyMovement = new THREE.Vector3(0, 0, movement.z);
                    const zOnlyPosition = this.mina.position.clone().add(zOnlyMovement);
                    if (!this.checkCollision(zOnlyPosition)) {
                        this.mina.position.copy(zOnlyPosition);
                        if (movement.z !== 0) this.mina.lookAt(this.mina.position.clone().add(zOnlyMovement));
                    }
                }
            }
            
            // Enhanced walking animation
            const time = this.clock.getElapsedTime();
            this.mina.position.y = 1.35 + Math.sin(time * 10) * 0.03;
            
            // Animate Mina's limbs while walking
            this.animateMinaWalking(time);
        }
    }
    
    updateCamera() {
        // Safety check - ensure Mina exists
        if (!this.mina) {
            console.warn('updateCamera called but Mina does not exist');
            return;
        }
        
        // Initialize camera rotation if needed
        if (!this.cameraRotation) {
            this.cameraRotation = { horizontal: 0, vertical: 0 };
        }
        
        const cameraDistance = 8; // Closer to see smaller character
        const cameraHeight = 4;   // Lower for better view
        
        // Calculate camera position based on rotation
        const x = this.mina.position.x + cameraDistance * Math.sin(this.cameraRotation.horizontal);
        const z = this.mina.position.z + cameraDistance * Math.cos(this.cameraRotation.horizontal);
        const y = this.mina.position.y + cameraHeight + Math.sin(this.cameraRotation.vertical) * 4;
        
        // Smoothly move camera to target position
        const targetPosition = new THREE.Vector3(x, y, z);
        this.camera.position.lerp(targetPosition, 0.1);
        
        // Always look at Mina
        this.camera.lookAt(this.mina.position);
    }
    
    updateDynamicLighting() {
        // Calculate time progression (0 = sunset, 1 = deep night)
        const elapsed = Date.now() - this.lightingSystem.startTime;
        const progress = Math.min(elapsed / this.lightingSystem.dayDuration, 1);
        this.gameState.timeOfDay = progress;
        
        // Interpolate colors and intensities
        const sunsetColor = { r: 1, g: 0.55, b: 0.26 }; // Orange sunset
        const nightColor = { r: 0.05, g: 0.05, b: 0.15 }; // Dark blue night
        
        // Sky color transition
        const skyR = sunsetColor.r + (nightColor.r - sunsetColor.r) * progress;
        const skyG = sunsetColor.g + (nightColor.g - sunsetColor.g) * progress;
        const skyB = sunsetColor.b + (nightColor.b - sunsetColor.b) * progress;
        
        // Update renderer clear color (sky)
        this.renderer.setClearColor(new THREE.Color(skyR, skyG, skyB));
        
        // Update ambient light intensity and color
        const ambientIntensity = 0.4 * (1 - progress * 0.7); // Fade to 30% of original
        this.lightingSystem.ambientLight.color.setRGB(skyR, skyG * 1.2, skyB * 1.5);
        this.lightingSystem.ambientLight.intensity = ambientIntensity;
        
        // Update sun light - fade as it "sets"
        const sunIntensity = 1.0 * (1 - progress); // Sun disappears completely at night
        this.lightingSystem.sunLight.intensity = sunIntensity;
        this.lightingSystem.sunLight.position.y = 30 - (progress * 50); // Sun goes below horizon
        
        // Update fill light to become moonlight
        const moonIntensity = 0.4 + (progress * 0.3); // Moon gets brighter as night deepens
        this.lightingSystem.fillLight.color.setRGB(0.6, 0.6, 1.0); // Blue moonlight
        this.lightingSystem.fillLight.intensity = moonIntensity * progress; // Only visible at night
        
        // Update hemisphere light
        const hemiSkyColor = { r: skyR * 0.8, g: skyG * 0.8, b: skyB * 1.2 };
        const hemiGroundColor = { r: 0.3, g: 0.1, b: 0.5 }; // Purple ground at night
        this.lightingSystem.hemiLight.color.setRGB(hemiSkyColor.r, hemiSkyColor.g, hemiSkyColor.b);
        this.lightingSystem.hemiLight.groundColor.setRGB(
            hemiGroundColor.r * (0.5 + progress * 0.5),
            hemiGroundColor.g * (0.5 + progress * 0.5),
            hemiGroundColor.b * (0.5 + progress * 0.5)
        );
        
        // Update fog to get darker and thicker at night
        const fogColor = new THREE.Color(skyR * 0.8, skyG * 0.8, skyB);
        this.scene.fog.color.copy(fogColor);
        this.scene.fog.near = 50 - (progress * 20); // Fog gets closer at night
        this.scene.fog.far = 300 - (progress * 100); // Fog gets thicker at night
        
        // Update time of day display
        const timeDisplay = progress < 0.3 ? 'Sunset' : 
                           progress < 0.7 ? 'Twilight' : 'Night';
        
        // Update debug info to show time of day
        const debugElement = document.getElementById('debug-info');
        if (debugElement) {
            debugElement.innerHTML = debugElement.innerHTML.replace(
                /Time: \w+\|?/g, ''
            ) + ` | Time: ${timeDisplay}`;
        }
    }
    
    animateMinaWalking(time) {
        // Find Mina's limbs for animation
        if (this.mina.children.length > 4) {
            const leftArm = this.mina.children.find(child => child.position.x < -0.2 && child.position.y > 0.3);
            const rightArm = this.mina.children.find(child => child.position.x > 0.2 && child.position.y > 0.3);
            const leftLeg = this.mina.children.find(child => child.position.x < -0.05 && child.position.y < 0);
            const rightLeg = this.mina.children.find(child => child.position.x > 0.05 && child.position.y < 0);
            
            if (leftArm) leftArm.rotation.x = Math.sin(time * 6) * 0.5;
            if (rightArm) rightArm.rotation.x = -Math.sin(time * 6) * 0.5;
            if (leftLeg) leftLeg.rotation.x = -Math.sin(time * 6) * 0.3;
            if (rightLeg) rightLeg.rotation.x = Math.sin(time * 6) * 0.3;
        }
    }
    
    updateSachaMovement(deltaTime) {
        if (!this.sacha || !this.mina) return;
        
        const distanceToMina = this.sacha.position.distanceTo(this.mina.position);
        const followDistance = this.sacha.userData.followDistance;
        const catchupSpeed = this.sacha.userData.catchupSpeed;
        const walkSpeed = this.sacha.userData.walkSpeed;
        
        // If Sacha is too far from Mina, catch up
        if (distanceToMina > followDistance + 5) {
            // Run to catch up
            const direction = new THREE.Vector3()
                .subVectors(this.mina.position, this.sacha.position)
                .normalize();
            
            const movement = direction.multiplyScalar(catchupSpeed * deltaTime);
            const newPosition = this.sacha.position.clone().add(movement);
            
            // Check collision for Sacha too
            const sachaBox = new THREE.Box3();
            const sachaBounds = new THREE.Vector3(0.5, 1.8, 0.5);
            sachaBox.setFromCenterAndSize(newPosition, sachaBounds);
            
            let canMove = true;
            for (let obj of this.collisionObjects) {
                if (obj.userData.boundingBox) {
                    obj.userData.boundingBox.setFromObject(obj);
                    if (sachaBox.intersectsBox(obj.userData.boundingBox)) {
                        canMove = false;
                        break;
                    }
                }
            }
            
            if (canMove) {
                this.sacha.position.copy(newPosition);
                this.sacha.lookAt(this.mina.position);
            } else {
                // Try sliding along walls like Mina
                const xOnlyMovement = new THREE.Vector3(movement.x, 0, 0);
                const xOnlyPosition = this.sacha.position.clone().add(xOnlyMovement);
                sachaBox.setFromCenterAndSize(xOnlyPosition, sachaBounds);
                
                let xCanMove = true;
                for (let obj of this.collisionObjects) {
                    if (obj.userData.boundingBox) {
                        obj.userData.boundingBox.setFromObject(obj);
                        if (sachaBox.intersectsBox(obj.userData.boundingBox)) {
                            xCanMove = false;
                            break;
                        }
                    }
                }
                
                if (xCanMove) {
                    this.sacha.position.copy(xOnlyPosition);
                    if (movement.x !== 0) this.sacha.lookAt(this.sacha.position.clone().add(xOnlyMovement));
                } else {
                    // Try Z direction
                    const zOnlyMovement = new THREE.Vector3(0, 0, movement.z);
                    const zOnlyPosition = this.sacha.position.clone().add(zOnlyMovement);
                    sachaBox.setFromCenterAndSize(zOnlyPosition, sachaBounds);
                    
                    let zCanMove = true;
                    for (let obj of this.collisionObjects) {
                        if (obj.userData.boundingBox) {
                            obj.userData.boundingBox.setFromObject(obj);
                            if (sachaBox.intersectsBox(obj.userData.boundingBox)) {
                                zCanMove = false;
                                break;
                            }
                        }
                    }
                    
                    if (zCanMove) {
                        this.sacha.position.copy(zOnlyPosition);
                        if (movement.z !== 0) this.sacha.lookAt(this.sacha.position.clone().add(zOnlyMovement));
                    }
                }
            }
            
            // Running animation for Sacha
            const time = this.clock.getElapsedTime();
            this.sacha.position.y = 1.35 + Math.sin(time * 12) * 0.05; // Faster bounce when running
            this.animateSachaMovement(time, true); // true = running
            
        } else if (distanceToMina > followDistance) {
            // Walk to follow at normal distance
            const direction = new THREE.Vector3()
                .subVectors(this.mina.position, this.sacha.position)
                .normalize();
            
            const movement = direction.multiplyScalar(walkSpeed * deltaTime);
            const newPosition = this.sacha.position.clone().add(movement);
            
            // Same collision detection as above
            const sachaBox = new THREE.Box3();
            const sachaBounds = new THREE.Vector3(0.5, 1.8, 0.5);
            sachaBox.setFromCenterAndSize(newPosition, sachaBounds);
            
            let canMove = true;
            for (let obj of this.collisionObjects) {
                if (obj.userData.boundingBox) {
                    obj.userData.boundingBox.setFromObject(obj);
                    if (sachaBox.intersectsBox(obj.userData.boundingBox)) {
                        canMove = false;
                        break;
                    }
                }
            }
            
            if (canMove) {
                this.sacha.position.copy(newPosition);
                this.sacha.lookAt(this.mina.position);
            } else {
                // Same wall sliding logic as catchup
                const xOnlyMovement = new THREE.Vector3(movement.x, 0, 0);
                const xOnlyPosition = this.sacha.position.clone().add(xOnlyMovement);
                sachaBox.setFromCenterAndSize(xOnlyPosition, sachaBounds);
                
                let xCanMove = true;
                for (let obj of this.collisionObjects) {
                    if (obj.userData.boundingBox) {
                        obj.userData.boundingBox.setFromObject(obj);
                        if (sachaBox.intersectsBox(obj.userData.boundingBox)) {
                            xCanMove = false;
                            break;
                        }
                    }
                }
                
                if (xCanMove) {
                    this.sacha.position.copy(xOnlyPosition);
                    if (movement.x !== 0) this.sacha.lookAt(this.sacha.position.clone().add(xOnlyMovement));
                } else {
                    const zOnlyMovement = new THREE.Vector3(0, 0, movement.z);
                    const zOnlyPosition = this.sacha.position.clone().add(zOnlyMovement);
                    sachaBox.setFromCenterAndSize(zOnlyPosition, sachaBounds);
                    
                    let zCanMove = true;
                    for (let obj of this.collisionObjects) {
                        if (obj.userData.boundingBox) {
                            obj.userData.boundingBox.setFromObject(obj);
                            if (sachaBox.intersectsBox(obj.userData.boundingBox)) {
                                zCanMove = false;
                                break;
                            }
                        }
                    }
                    
                    if (zCanMove) {
                        this.sacha.position.copy(zOnlyPosition);
                        if (movement.z !== 0) this.sacha.lookAt(this.sacha.position.clone().add(zOnlyMovement));
                    }
                }
            }
            
            // Walking animation for Sacha
            const time = this.clock.getElapsedTime();
            this.sacha.position.y = 1.35 + Math.sin(time * 8) * 0.03; // Normal walking bounce
            this.animateSachaMovement(time, false); // false = walking
            
        } else {
            // Sacha is close enough, just idle animation
            const time = this.clock.getElapsedTime();
            this.sacha.position.y = 1.35 + Math.sin(time * 2) * 0.01; // Gentle breathing
            
            // Look at Mina occasionally when idle
            if (Math.sin(time * 0.5) > 0.8) {
                this.sacha.lookAt(this.mina.position);
            }
        }
    }
    
    animateSachaMovement(time, isRunning) {
        // Find Sacha's limbs for animation
        if (this.sacha.children.length > 4) {
            const leftArm = this.sacha.children.find(child => child.position.x < -0.2 && child.position.y > 0.3);
            const rightArm = this.sacha.children.find(child => child.position.x > 0.2 && child.position.y > 0.3);
            const leftLeg = this.sacha.children.find(child => child.position.x < -0.05 && child.position.y < 0);
            const rightLeg = this.sacha.children.find(child => child.position.x > 0.05 && child.position.y < 0);
            
            const animSpeed = isRunning ? 10 : 6; // Faster animation when running
            const animIntensity = isRunning ? 0.7 : 0.5; // More dramatic movement when running
            
            if (leftArm) leftArm.rotation.x = Math.sin(time * animSpeed) * animIntensity;
            if (rightArm) rightArm.rotation.x = -Math.sin(time * animSpeed) * animIntensity;
            if (leftLeg) leftLeg.rotation.x = -Math.sin(time * animSpeed) * (animIntensity * 0.6);
            if (rightLeg) rightLeg.rotation.x = Math.sin(time * animSpeed) * (animIntensity * 0.6);
        }
    }
    
    updateMonsters(deltaTime) {
        this.gameState.monstersNearby = 0;
        
        this.monsters.forEach(monster => {
            const distanceToMina = monster.position.distanceTo(this.mina.position);
            
            if (distanceToMina < monster.userData.detectionRadius) {
                this.gameState.monstersNearby++;
                monster.userData.chasing = true;
                
                // Chase Mina
                const direction = new THREE.Vector3()
                    .subVectors(this.mina.position, monster.position)
                    .normalize();
                
                monster.position.add(direction.multiplyScalar(monster.userData.speed * deltaTime));
                monster.lookAt(this.mina.position);
                
                // Check if monster caught Mina
                if (distanceToMina < 2) {
                    this.gameState.health -= 10 * deltaTime;
                    if (this.gameState.health <= 0) {
                        this.gameOver();
                    }
                }
            } else {
                monster.userData.chasing = false;
                // Random wandering when not chasing
                if (Math.random() < 0.1) {
                    monster.userData.targetPosition.set(
                        monster.position.x + (Math.random() - 0.5) * 20,
                        monster.position.y,
                        monster.position.z + (Math.random() - 0.5) * 20
                    );
                }
                
                const direction = new THREE.Vector3()
                    .subVectors(monster.userData.targetPosition, monster.position);
                if (direction.length() > 1) {
                    direction.normalize();
                    monster.position.add(direction.multiplyScalar(monster.userData.speed * 0.3 * deltaTime));
                }
            }
            
            // Simple monster animation
            monster.rotation.y += Math.sin(this.clock.getElapsedTime() + monster.userData.id) * 0.01;
        });
    }
    
    checkTreasureCollection() {
        this.treasures.forEach(treasure => {
            if (!treasure.userData.collected) {
                const distance = this.mina.position.distanceTo(treasure.position);
                if (distance < 3) {
                    treasure.userData.collected = true;
                    treasure.visible = false;
                    this.gameState.treasuresFound++;
                    
                    console.log(`Treasure collected! ${this.gameState.treasuresFound}/${this.gameState.totalTreasures}`);
                    
                    if (this.gameState.treasuresFound >= this.gameState.totalTreasures) {
                        this.gameWon();
                    }
                }
            }
        });
    }
    
    gameWon() {
        this.gameState.gameWon = true;
        document.getElementById('objective').innerHTML = '🎉 CONGRATULATIONS! Mina found all treasures! 🎉';
        document.getElementById('objective').style.color = '#00ff00';
        console.log('Game Won!');
    }
    
    gameOver() {
        this.gameState.gameOver = true;
        document.getElementById('objective').innerHTML = '💀 GAME OVER - The mummies caught Mina! 💀';
        document.getElementById('objective').style.color = '#ff0000';
        console.log('Game Over!');
    }
    
    updateUI() {
        document.getElementById('health').textContent = Math.max(0, Math.round(this.gameState.health));
        document.getElementById('treasures').textContent = this.gameState.treasuresFound;
        document.getElementById('monsters').textContent = this.gameState.monstersNearby;
        
        // Health bar color
        const healthElement = document.getElementById('health');
        if (this.gameState.health > 60) {
            healthElement.style.color = '#00ff00';
        } else if (this.gameState.health > 30) {
            healthElement.style.color = '#ffff00';
        } else {
            healthElement.style.color = '#ff0000';
        }
        
        // Debug info
        if (this.mina) {
            const pos = this.mina.position;
            const debugElement = document.getElementById('debug-info');
            if (debugElement) {
                debugElement.innerHTML = `
                    Mouse: ${this.mouseLocked ? 'Locked' : 'Click to lock'} | 
                    Position: ${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)} |
                    Keys: W:${this.controls.forward} A:${this.controls.left} S:${this.controls.backward} D:${this.controls.right}
                `;
            }
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const deltaTime = this.clock.getDelta();
        
        // Always update camera
        this.updateCamera();
        
        // Allow movement even without mouse lock for testing
        const allowMovement = true; // Set to true for testing
        
        if ((allowMovement || this.mouseLocked) && !this.gameState.gameOver && !this.gameState.gameWon) {
            this.updateMinaMovement(deltaTime);
            this.updateSachaMovement(deltaTime);
            this.updateMonsters(deltaTime);
            this.checkTreasureCollection();
        } else {
            console.log('Movement blocked - mouseLocked:', this.mouseLocked, 'gameOver:', this.gameState.gameOver, 'gameWon:', this.gameState.gameWon);
        }
        
        // Always update NPCs even when game is paused
        this.updateNPCs(deltaTime);
        
        // Update particle effects
        this.updateParticleEffects();
        
        // Update dynamic lighting
        this.updateDynamicLighting();
        
        // Update speech system
        this.updateSpeechSystem();
        
        this.updateUI();
        this.renderer.render(this.scene, this.camera);
    }
}

// Console logging disabled for production

window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting Mina\'s Adventure...');
    if (typeof THREE === 'undefined') {
        console.error('Three.js not loaded!');
        alert('Three.js library failed to load. Check your internet connection.');
        return;
    }
    console.log('Three.js version:', THREE.REVISION);
    
    try {
        console.log('Creating MinaAdventureGame instance...');
        const game = new MinaAdventureGame();
        console.log('Mina\'s Adventure game initialized successfully!');
        
        // Add game to window for debugging
        window.game = game;
        console.log('Game object available as window.game for debugging');
        
        // Log Mina's status after initialization
        setTimeout(() => {
            if (game.mina) {
                console.log('Mina status check - Position:', game.mina.position);
                console.log('Mina status check - Visible:', game.mina.visible);
                console.log('Mina status check - In scene:', game.scene.children.includes(game.mina));
            } else {
                console.error('Mina status check - MINA IS NULL/UNDEFINED!');
            }
        }, 100);
        
    } catch (error) {
        console.error('Error initializing game:', error);
        console.error('Error stack:', error.stack);
        alert('Error starting the game: ' + error.message);
    }
});