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
        this.crowds = []; // Moving crowds of people
        this.rides = []; // Interactive theme park rides
        this.worldEvents = []; // Dynamic events happening in the world
        this.interactiveNPCs = []; // NPCs that can talk to the girls
        this.buildings = []; // Interior building spaces
        this.rideVehicles = []; // Vehicles that girls can ride
        this.currentInterior = null; // Current interior space player is in
        
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
        this.createInteractiveNPCs();
        this.createCrowdSystem();
        this.createThemeRides();
        this.createBuildingInteriors();
        this.createRideVehicles();
        this.startWorldEvents();
        this.addParticleEffects();
        this.animate();
    }
    
    init() {
        console.log('Initializing Mina\'s Adventure...');
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xff4500); // Beautiful sunset orange sky
        
        // Aggressive mobile performance optimizations
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio even more
        this.renderer.shadowMap.enabled = false; // Disable shadows completely for performance
        this.renderer.powerPreference = 'low-power'; // Force low-power mode
        console.log('🚀 Mobile optimizations enabled for all devices');
        
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
        
        // Enhanced arms with upper and lower sections
        const upperArmGeometry = new THREE.CylinderGeometry(0.055, 0.05, 0.18, 8);
        const forearmGeometry = new THREE.CylinderGeometry(0.045, 0.04, 0.15, 8);
        const armMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffdbac,
            shininess: 20,
            specular: 0x333333
        });
        
        // Left arm
        const leftUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        leftUpperArm.position.set(-0.25, 0.45, 0);
        leftUpperArm.castShadow = true;
        leftUpperArm.name = 'leftUpperArm';
        characterGroup.add(leftUpperArm);
        
        const leftForearm = new THREE.Mesh(forearmGeometry, armMaterial);
        leftForearm.position.set(-0.25, 0.22, 0);
        leftForearm.castShadow = true;
        leftForearm.name = 'leftForearm';
        characterGroup.add(leftForearm);
        
        // Right arm
        const rightUpperArm = new THREE.Mesh(upperArmGeometry, armMaterial);
        rightUpperArm.position.set(0.25, 0.45, 0);
        rightUpperArm.castShadow = true;
        rightUpperArm.name = 'rightUpperArm';
        characterGroup.add(rightUpperArm);
        
        const rightForearm = new THREE.Mesh(forearmGeometry, armMaterial);
        rightForearm.position.set(0.25, 0.22, 0);
        rightForearm.castShadow = true;
        rightForearm.name = 'rightForearm';
        characterGroup.add(rightForearm);
        
        // Enhanced hands with fingers
        const handGeometry = new THREE.SphereGeometry(0.04, 10, 8);
        const handMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffdbac,
            shininess: 25,
            specular: 0x444444
        });
        
        // Left hand
        const leftHand = new THREE.Mesh(handGeometry, handMaterial);
        leftHand.position.set(-0.25, 0.12, 0);
        leftHand.castShadow = true;
        leftHand.name = 'leftHand';
        characterGroup.add(leftHand);
        
        // Right hand
        const rightHand = new THREE.Mesh(handGeometry, handMaterial);
        rightHand.position.set(0.25, 0.12, 0);
        rightHand.castShadow = true;
        rightHand.name = 'rightHand';
        characterGroup.add(rightHand);
        
        // Add individual fingers to both hands
        const fingerGeometry = new THREE.CylinderGeometry(0.008, 0.006, 0.04, 4);
        const fingerMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xffdbac,
            shininess: 30
        });
        
        // Left hand fingers
        for (let i = 0; i < 5; i++) {
            const finger = new THREE.Mesh(fingerGeometry, fingerMaterial);
            const angle = (i - 2) * 0.3;
            finger.position.set(
                -0.25 + Math.sin(angle) * 0.035,
                0.08,
                Math.cos(angle) * 0.035
            );
            finger.rotation.z = angle;
            finger.castShadow = true;
            characterGroup.add(finger);
        }
        
        // Right hand fingers
        for (let i = 0; i < 5; i++) {
            const finger = new THREE.Mesh(fingerGeometry, fingerMaterial);
            const angle = (i - 2) * 0.3;
            finger.position.set(
                0.25 + Math.sin(angle) * 0.035,
                0.08,
                Math.cos(angle) * 0.035
            );
            finger.rotation.z = -angle;
            finger.castShadow = true;
            characterGroup.add(finger);
        }
        
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
        
        // Add animation properties
        characterGroup.userData.animations = {
            idle: { time: 0, speed: 1 },
            walking: { time: 0, speed: 2 },
            jumping: { time: 0, speed: 4 },
            scared: { time: 0, speed: 8 },
            laughing: { time: 0, speed: 6 },
            waving: { time: 0, speed: 4 },
            dancing: { time: 0, speed: 5 },
            currentState: 'idle',
            isAnimating: false,
            animationDuration: 0,
            originalY: position.y
        };
        
        // Store references to body parts for animation
        characterGroup.userData.bodyParts = {
            head: characterGroup.children.find(child => child.geometry instanceof THREE.SphereGeometry),
            leftUpperArm: characterGroup.children.find(child => child.name === 'leftUpperArm'),
            rightUpperArm: characterGroup.children.find(child => child.name === 'rightUpperArm'),
            leftForearm: characterGroup.children.find(child => child.name === 'leftForearm'),
            rightForearm: characterGroup.children.find(child => child.name === 'rightForearm'),
            leftHand: characterGroup.children.find(child => child.name === 'leftHand'),
            rightHand: characterGroup.children.find(child => child.name === 'rightHand'),
            body: characterGroup.children.find(child => child.geometry instanceof THREE.BoxGeometry)
        };
        
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
            const testSimple = false; // Use detailed character now that movement works
            
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
                chasing: false,
                originalY: monster.position.y,
                spawnPosition: new THREE.Vector3(spawn.x, monster.position.y, spawn.z),
                aiState: 'patrolling'
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
    
    // ===== DYNAMIC WORLD SYSTEMS =====
    
    createInteractiveNPCs() {
        console.log('🎭 Creating interactive NPCs...');
        
        const interactiveNPCData = [
            // Park Staff who interact with guests
            { x: 10, z: 90, type: 'staff', name: 'Emma the Guide', 
              dialogues: [
                'Welcome to Universal Studios Singapore!',
                'The Mummy ride is really scary but so much fun!',
                'Have you tried the Jurassic Park ride yet?',
                'Don\'t miss the Far Far Away castle!'
              ]
            },
            { x: -20, z: 30, type: 'vendor', name: 'Carlos the Snack Man',
              dialogues: [
                'Fresh popcorn! Get your popcorn here!',
                'Would you like some cotton candy?',
                'Best ice cream in the whole park!',
                'Stay hydrated, girls!'
              ]
            },
            { x: -70, z: 10, type: 'photographer', name: 'Maya the Photo Lady',
              dialogues: [
                'Perfect! Hold that pose!',
                'You two look amazing together!',
                'Want a photo with the pyramid?',
                'Say cheese for the camera!'
              ]
            },
            { x: 70, z: -70, type: 'mechanic', name: 'Tech Mike',
              dialogues: [
                'The robots here are so cool!',
                'This is the future of theme parks!',
                'Did you see the holographic displays?',
                'Technology is amazing, isn\'t it?'
              ]
            },
            { x: -70, z: 70, type: 'princess', name: 'Princess Fiona',
              dialogues: [
                'Welcome to Far Far Away!',
                'Have you seen Shrek around?',
                'This castle is magical!',
                'Dreams really do come true here!'
              ]
            }
        ];
        
        interactiveNPCData.forEach(npcData => {
            const npc = this.createDetailedNPC(npcData);
            this.interactiveNPCs.push(npc);
            this.scene.add(npc);
        });
    }
    
    createDetailedNPC(npcData) {
        const npcGroup = new THREE.Group();
        
        // More detailed character than regular NPCs
        const scale = 2.5;
        
        // Body
        const bodyGeometry = new THREE.BoxGeometry(0.4 * scale, 0.6 * scale, 0.2 * scale);
        const bodyColor = npcData.type === 'staff' ? 0x0066cc : 
                         npcData.type === 'vendor' ? 0xff6600 :
                         npcData.type === 'photographer' ? 0x9966cc :
                         npcData.type === 'mechanic' ? 0x333333 :
                         0xff69b4; // princess
                         
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: bodyColor });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3 * scale;
        body.castShadow = true;
        npcGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.15 * scale, 16, 12);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.75 * scale;
        head.castShadow = true;
        npcGroup.add(head);
        
        // Special accessories based on type
        if (npcData.type === 'staff') {
            // Staff hat
            const hatGeometry = new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.1 * scale);
            const hatMaterial = new THREE.MeshPhongMaterial({ color: 0x003366 });
            const hat = new THREE.Mesh(hatGeometry, hatMaterial);
            hat.position.y = 0.85 * scale;
            npcGroup.add(hat);
        } else if (npcData.type === 'photographer') {
            // Camera
            const cameraGeometry = new THREE.BoxGeometry(0.2 * scale, 0.15 * scale, 0.1 * scale);
            const cameraMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
            const camera = new THREE.Mesh(cameraGeometry, cameraMaterial);
            camera.position.set(0.3 * scale, 0.4 * scale, 0.2 * scale);
            npcGroup.add(camera);
        }
        
        // Position and data
        npcGroup.position.set(npcData.x, 0, npcData.z);
        npcGroup.userData = {
            type: 'interactiveNPC',
            name: npcData.name,
            dialogues: npcData.dialogues,
            lastInteraction: 0,
            currentDialogue: 0,
            isInteracting: false,
            interactionRange: 8,
            personality: npcData.type
        };
        
        return npcGroup;
    }
    
    createCrowdSystem() {
        console.log('👥 Creating crowd system...');
        
        // Create moving groups of people
        const crowdGroups = [
            // Hollywood entrance crowd
            { centerX: 0, centerZ: 100, count: 8, radius: 15, speed: 0.5 },
            // Lagoon walkers
            { centerX: 0, centerZ: 0, count: 12, radius: 25, speed: 0.3 },
            // Sci-Fi City visitors
            { centerX: 80, centerZ: -80, count: 6, radius: 20, speed: 0.7 },
            // Egypt explorers
            { centerX: -80, centerZ: 0, count: 5, radius: 18, speed: 0.4 },
            // Castle visitors
            { centerX: -80, centerZ: 80, count: 7, radius: 22, speed: 0.6 }
        ];
        
        crowdGroups.forEach((groupData, groupIndex) => {
            const crowd = [];
            for (let i = 0; i < groupData.count; i++) {
                const person = this.createCrowdPerson();
                
                // Random position within the group's area
                const angle = (i / groupData.count) * Math.PI * 2;
                const distance = Math.random() * groupData.radius;
                person.position.set(
                    groupData.centerX + Math.cos(angle) * distance,
                    0,
                    groupData.centerZ + Math.sin(angle) * distance
                );
                
                person.userData.groupId = groupIndex;
                person.userData.groupCenter = { x: groupData.centerX, z: groupData.centerZ };
                person.userData.groupRadius = groupData.radius;
                person.userData.baseSpeed = groupData.speed;
                person.userData.direction = Math.random() * Math.PI * 2;
                person.userData.directionChangeTime = 0;
                
                crowd.push(person);
                this.scene.add(person);
            }
            this.crowds.push(crowd);
        });
    }
    
    createCrowdPerson() {
        const personGroup = new THREE.Group();
        const scale = 1.5 + Math.random() * 0.5; // Varied sizes
        
        // Simple but distinctive character
        const bodyGeometry = new THREE.CylinderGeometry(0.15 * scale, 0.2 * scale, 0.8 * scale);
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b, 0x6c5ce7];
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)] 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.4 * scale;
        body.castShadow = true;
        personGroup.add(body);
        
        // Head
        const headGeometry = new THREE.SphereGeometry(0.12 * scale, 8, 6);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.9 * scale;
        head.castShadow = true;
        personGroup.add(head);
        
        personGroup.userData.type = 'crowdPerson';
        personGroup.userData.walkSpeed = 0.5 + Math.random() * 0.5;
        
        return personGroup;
    }
    
    createThemeRides() {
        console.log('🎢 Creating interactive theme rides...');
        
        const rides = [
            // Roller Coaster in Sci-Fi City
            { x: 75, z: -75, type: 'rollercoaster', name: 'Battlestar Galactica' },
            // Mummy ride in Egypt
            { x: -75, z: 5, type: 'indoor', name: 'Revenge of the Mummy' },
            // Castle ride in Far Far Away
            { x: -75, z: 75, type: 'family', name: 'Shrek 4-D Adventure' },
            // Water ride in Lost World
            { x: -75, z: -75, type: 'water', name: 'Jurassic Park Rapids' },
            // NEW: Haunted Mansion in Hollywood
            { x: 75, z: 75, type: 'haunted', name: 'Haunted Hollywood Mansion' }
        ];
        
        rides.forEach(rideData => {
            const ride = this.createRide(rideData);
            this.rides.push(ride);
            this.scene.add(ride);
        });
    }
    
    createRide(rideData) {
        const rideGroup = new THREE.Group();
        
        // Base platform
        const platformGeometry = new THREE.BoxGeometry(8, 0.5, 8);
        const platformMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = 0.25;
        rideGroup.add(platform);
        
        // Ride-specific elements
        switch(rideData.type) {
            case 'rollercoaster':
                // Add track pieces
                for (let i = 0; i < 5; i++) {
                    const trackGeometry = new THREE.BoxGeometry(1, 0.2, 0.3);
                    const trackMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
                    const track = new THREE.Mesh(trackGeometry, trackMaterial);
                    track.position.set(i * 1.5 - 3, 1 + i * 0.5, 0);
                    track.rotation.x = i * 0.2;
                    rideGroup.add(track);
                }
                break;
                
            case 'indoor':
                // Pyramid entrance
                const pyramidGeometry = new THREE.ConeGeometry(4, 6, 4);
                const pyramidMaterial = new THREE.MeshPhongMaterial({ color: 0xdaa520 });
                const pyramid = new THREE.Mesh(pyramidGeometry, pyramidMaterial);
                pyramid.position.y = 3.5;
                pyramid.rotation.y = Math.PI / 4;
                rideGroup.add(pyramid);
                break;
                
            case 'family':
                // Castle tower
                const towerGeometry = new THREE.CylinderGeometry(2, 2.5, 8);
                const towerMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
                const tower = new THREE.Mesh(towerGeometry, towerMaterial);
                tower.position.y = 4.5;
                rideGroup.add(tower);
                break;
                
            case 'water':
                // Water splash effect placeholder
                const splashGeometry = new THREE.SphereGeometry(3, 8, 6);
                const splashMaterial = new THREE.MeshPhongMaterial({ 
                    color: 0x87ceeb, 
                    transparent: true, 
                    opacity: 0.6 
                });
                const splash = new THREE.Mesh(splashGeometry, splashMaterial);
                splash.position.y = 3;
                splash.scale.y = 0.3;
                rideGroup.add(splash);
                break;
                
            case 'haunted':
                // Spooky Victorian mansion
                const hauntedBaseGeometry = new THREE.BoxGeometry(6, 4, 6);
                const hauntedBaseMaterial = new THREE.MeshPhongMaterial({ color: 0x2d2d2d });
                const hauntedBase = new THREE.Mesh(hauntedBaseGeometry, hauntedBaseMaterial);
                hauntedBase.position.y = 2.5;
                rideGroup.add(hauntedBase);
                
                // Gothic roof
                const hauntedRoofGeometry = new THREE.ConeGeometry(4.5, 3, 4);
                const hauntedRoofMaterial = new THREE.MeshPhongMaterial({ color: 0x1a1a1a });
                const hauntedRoof = new THREE.Mesh(hauntedRoofGeometry, hauntedRoofMaterial);
                hauntedRoof.position.y = 5.5;
                hauntedRoof.rotation.y = Math.PI / 4;
                rideGroup.add(hauntedRoof);
                
                // Spooky tower
                const hauntedTowerGeometry = new THREE.CylinderGeometry(1, 1.2, 5);
                const hauntedTowerMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const hauntedTower = new THREE.Mesh(hauntedTowerGeometry, hauntedTowerMaterial);
                hauntedTower.position.set(2, 4, 2);
                rideGroup.add(hauntedTower);
                
                // Glowing windows
                for (let i = 0; i < 4; i++) {
                    const hauntedWindowGeometry = new THREE.PlaneGeometry(0.8, 1);
                    const hauntedWindowMaterial = new THREE.MeshBasicMaterial({ 
                        color: 0xffff00, 
                        transparent: true, 
                        opacity: 0.7 
                    });
                    const hauntedWindow = new THREE.Mesh(hauntedWindowGeometry, hauntedWindowMaterial);
                    const angle = (i / 4) * Math.PI * 2;
                    hauntedWindow.position.set(Math.cos(angle) * 3, 3, Math.sin(angle) * 3);
                    hauntedWindow.lookAt(0, 3, 0);
                    rideGroup.add(hauntedWindow);
                }
                
                // Spooky entrance door
                const hauntedDoorGeometry = new THREE.BoxGeometry(1, 2.5, 0.2);
                const hauntedDoorMaterial = new THREE.MeshPhongMaterial({ color: 0x4a2c17 });
                const hauntedDoor = new THREE.Mesh(hauntedDoorGeometry, hauntedDoorMaterial);
                hauntedDoor.position.set(0, 1.25, 3.1);
                rideGroup.add(hauntedDoor);
                break;
        }
        
        rideGroup.position.set(rideData.x, 0, rideData.z);
        rideGroup.userData = {
            type: 'ride',
            name: rideData.name,
            rideType: rideData.type,
            isActive: true,
            interactionRange: 6,
            lastActivation: 0
        };
        
        return rideGroup;
    }
    
    createBuildingInteriors() {
        console.log('🏢 Creating building interiors...');
        
        // Find the Mummy pyramid and create interior
        const mummyRide = this.rides.find(ride => ride.userData.name === 'Revenge of the Mummy');
        if (mummyRide) {
            this.createMummyInterior(mummyRide);
        }
        
        // Find the Haunted Mansion and create interior
        const hauntedRide = this.rides.find(ride => ride.userData.name === 'Haunted Hollywood Mansion');
        if (hauntedRide) {
            this.createHauntedInterior(hauntedRide);
        }
        
        // Add entrance markers to buildings
        this.addBuildingEntrances();
    }
    
    createMummyInterior(parentRide) {
        const interior = new THREE.Group();
        interior.name = 'mummyDarkRide';
        
        // Initialize dark ride system
        this.initializeDarkRideSystem(interior, parentRide);
        
        // Create tomb chamber - larger interior space
        const chamberGeometry = new THREE.BoxGeometry(25, 12, 25);
        const chamberMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8b7355,
            side: THREE.BackSide // Show inside faces
        });
        const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
        chamber.position.y = 6;
        interior.add(chamber);
        
        // Hieroglyphic walls (textured pillars)
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const pillarGeometry = new THREE.BoxGeometry(2, 10, 1);
            const pillarMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xcd853f,
                shininess: 10
            });
            const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            pillar.position.set(
                Math.cos(angle) * 10,
                5,
                Math.sin(angle) * 10
            );
            pillar.castShadow = true;
            interior.add(pillar);
            
            // Add hieroglyphic decorations
            const hieroGeometry = new THREE.BoxGeometry(1.8, 0.5, 0.1);
            const hieroMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
            for (let j = 0; j < 3; j++) {
                const hiero = new THREE.Mesh(hieroGeometry, hieroMaterial);
                hiero.position.set(
                    Math.cos(angle) * 10.1,
                    3 + j * 2,
                    Math.sin(angle) * 10.1
                );
                hiero.rotation.y = angle;
                interior.add(hiero);
            }
        }
        
        // Central sarcophagus
        const sarcophagusGeometry = new THREE.BoxGeometry(3, 1, 8);
        const sarcophagusMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
        const sarcophagus = new THREE.Mesh(sarcophagusGeometry, sarcophagusMaterial);
        sarcophagus.position.set(0, 0.5, 0);
        sarcophagus.castShadow = true;
        interior.add(sarcophagus);
        
        // Treasure chests around the room
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI/4;
            const chestGeometry = new THREE.BoxGeometry(1.5, 1, 1);
            const chestMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
            const chest = new THREE.Mesh(chestGeometry, chestMaterial);
            chest.position.set(
                Math.cos(angle) * 6,
                0.5,
                Math.sin(angle) * 6
            );
            chest.userData.type = 'treasure';
            chest.castShadow = true;
            interior.add(chest);
        }
        
        // Torches for atmospheric lighting
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const torchLight = new THREE.PointLight(0xff6600, 0.8, 15);
            torchLight.position.set(
                Math.cos(angle) * 8,
                7,
                Math.sin(angle) * 8
            );
            torchLight.castShadow = true;
            interior.add(torchLight);
            
            // Visual torch
            const torchGeometry = new THREE.CylinderGeometry(0.1, 0.2, 2);
            const torchMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
            const torch = new THREE.Mesh(torchGeometry, torchMaterial);
            torch.position.copy(torchLight.position);
            torch.position.y -= 1;
            interior.add(torch);
        }
        
        // Position interior relative to the pyramid
        interior.position.copy(parentRide.position);
        interior.position.y = -50; // Underground
        interior.visible = false; // Hidden by default
        
        interior.userData = {
            type: 'interior',
            parentBuilding: parentRide,
            entranceRange: 5,
            name: 'Mummy Tomb Interior'
        };
        
        this.buildings.push(interior);
        this.scene.add(interior);
        
        console.log('🏺 Created Mummy Dark Ride Experience');
    }
    
    initializeDarkRideSystem(interior, parentRide) {
        // Create the complete dark ride experience
        const rideSystem = {
            showBuilding: null,
            queueLine: [],
            preShowRoom: null,
            rideVehicles: [],
            trackPath: [],
            currentScene: 0,
            rideActive: false,
            boardingStation: null,
            unloadStation: null
        };
        
        // Store ride system in interior userData
        interior.userData.rideSystem = rideSystem;
        
        // Build show building exterior
        this.buildShowBuilding(interior, rideSystem, parentRide.position);
        
        // Create queue line with switchbacks
        this.buildQueueLine(interior, rideSystem, parentRide.position);
        
        // Create pre-show chamber
        this.buildPreShowRoom(interior, rideSystem, parentRide.position);
        
        // Build ride track system
        this.buildRideTrack(interior, rideSystem, parentRide.position);
        
        // Create ride vehicles
        this.buildRideVehicles(interior, rideSystem, parentRide.position);
        
        // Build all ride scenes
        this.buildAllRideScenes(interior, rideSystem, parentRide.position);
    }
    
    buildShowBuilding(interior, rideSystem, basePos) {
        // Create massive show building (80x40x60)
        const buildingGroup = new THREE.Group();
        
        // Main structure
        const buildingGeometry = new THREE.BoxGeometry(80, 40, 60);
        const buildingMaterial = new THREE.MeshPhongMaterial({
            color: 0x2a2416,
            side: THREE.BackSide
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = 20;
        buildingGroup.add(building);
        
        // Grand entrance portal
        const portalGeometry = new THREE.BoxGeometry(8, 12, 2);
        const portalMaterial = new THREE.MeshPhongMaterial({
            color: 0xcd853f
        });
        const portal = new THREE.Mesh(portalGeometry, portalMaterial);
        portal.position.set(0, 6, 30);
        buildingGroup.add(portal);
        
        // Hieroglyphic decorations on entrance
        for (let i = 0; i < 5; i++) {
            const hieroGeometry = new THREE.BoxGeometry(1, 0.8, 0.1);
            const hieroMaterial = new THREE.MeshPhongMaterial({
                color: 0x4a4a4a,
                emissive: 0x222222
            });
            const hiero = new THREE.Mesh(hieroGeometry, hieroMaterial);
            hiero.position.set(-3 + i * 1.5, 8, 30.5);
            buildingGroup.add(hiero);
        }
        
        interior.add(buildingGroup);
        rideSystem.showBuilding = buildingGroup;
    }
    
    buildQueueLine(interior, rideSystem, basePos) {
        const queueGroup = new THREE.Group();
        
        // Create winding queue with railings
        const queuePoints = [
            { x: 0, z: 25 },
            { x: 10, z: 25 },
            { x: 10, z: 20 },
            { x: -10, z: 20 },
            { x: -10, z: 15 },
            { x: 5, z: 15 },
            { x: 5, z: 10 }
        ];
        
        // Build queue railings
        for (let i = 0; i < queuePoints.length - 1; i++) {
            const start = queuePoints[i];
            const end = queuePoints[i + 1];
            const distance = Math.sqrt(
                Math.pow(end.x - start.x, 2) + 
                Math.pow(end.z - start.z, 2)
            );
            
            const railGeometry = new THREE.BoxGeometry(distance, 1, 0.1);
            const railMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
            const rail = new THREE.Mesh(railGeometry, railMaterial);
            
            rail.position.set(
                (start.x + end.x) / 2,
                0.5,
                (start.z + end.z) / 2
            );
            
            const angle = Math.atan2(end.z - start.z, end.x - start.x);
            rail.rotation.y = angle;
            
            queueGroup.add(rail);
        }
        
        // Add themed props along queue
        const props = [
            { type: 'sarcophagus', x: 12, z: 22 },
            { type: 'artifact', x: -8, z: 17 },
            { type: 'excavation', x: 3, z: 12 }
        ];
        
        props.forEach(prop => {
            if (prop.type === 'sarcophagus') {
                const sarcGeometry = new THREE.BoxGeometry(2, 3, 1);
                const sarcMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
                const sarc = new THREE.Mesh(sarcGeometry, sarcMaterial);
                sarc.position.set(prop.x, 1.5, prop.z);
                sarc.rotation.y = Math.random() * Math.PI;
                queueGroup.add(sarc);
            }
        });
        
        interior.add(queueGroup);
        rideSystem.queueLine = queueGroup;
    }
    
    buildPreShowRoom(interior, rideSystem, basePos) {
        const preShowGroup = new THREE.Group();
        
        // Circular chamber
        const chamberGeometry = new THREE.CylinderGeometry(5, 5, 4, 16);
        const chamberMaterial = new THREE.MeshPhongMaterial({
            color: 0x3a3226,
            side: THREE.BackSide
        });
        const chamber = new THREE.Mesh(chamberGeometry, chamberMaterial);
        chamber.position.set(0, 2, 5);
        preShowGroup.add(chamber);
        
        // Central artifact pedestal
        const pedestalGeometry = new THREE.CylinderGeometry(1, 1.2, 1);
        const pedestalMaterial = new THREE.MeshPhongMaterial({ color: 0x8b7355 });
        const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMaterial);
        pedestal.position.set(0, 0.5, 5);
        preShowGroup.add(pedestal);
        
        // Mystical artifact on pedestal
        const artifactGeometry = new THREE.OctahedronGeometry(0.5);
        const artifactMaterial = new THREE.MeshPhongMaterial({
            color: 0xffd700,
            emissive: 0xffaa00,
            emissiveIntensity: 0.3
        });
        const artifact = new THREE.Mesh(artifactGeometry, artifactMaterial);
        artifact.position.set(0, 1.5, 5);
        artifact.userData.animationType = 'rotate';
        preShowGroup.add(artifact);
        
        interior.add(preShowGroup);
        rideSystem.preShowRoom = preShowGroup;
    }
    
    buildRideTrack(interior, rideSystem, basePos) {
        // Create spline path for ride track (400m total)
        const trackPoints = [
            // Station
            new THREE.Vector3(0, 1, 0),
            // Scene 1 - Tomb Entry
            new THREE.Vector3(0, 1, -10),
            new THREE.Vector3(0, 0, -20),
            new THREE.Vector3(5, -1, -25),
            // Scene 2 - Treasure Chamber  
            new THREE.Vector3(15, -1, -25),
            new THREE.Vector3(20, -1, -20),
            new THREE.Vector3(20, -1, -10),
            // Scene 3 - Mummy Awakening
            new THREE.Vector3(15, -1, 0),
            new THREE.Vector3(10, -1, 5),
            // Scene 4 - Curse Chamber
            new THREE.Vector3(0, -1, 10),
            new THREE.Vector3(-10, 0, 10),
            // Scene 5 - Escape
            new THREE.Vector3(-15, 1, 5),
            new THREE.Vector3(-15, 2, -5),
            // Scene 6 - Finale
            new THREE.Vector3(-10, 2, -10),
            new THREE.Vector3(-5, 1, -5),
            new THREE.Vector3(0, 1, 0) // Return to station
        ];
        
        // Create visible track
        const trackGeometry = new THREE.BufferGeometry().setFromPoints(trackPoints);
        const trackMaterial = new THREE.LineBasicMaterial({ 
            color: 0x444444,
            linewidth: 2 
        });
        const trackLine = new THREE.Line(trackGeometry, trackMaterial);
        trackLine.visible = false; // Hide in production
        interior.add(trackLine);
        
        // Store track data
        rideSystem.trackPath = trackPoints;
        rideSystem.trackSpline = new THREE.CatmullRomCurve3(trackPoints);
    }
    
    buildRideVehicles(interior, rideSystem, basePos) {
        // Create Explorer Cart vehicles
        for (let i = 0; i < 3; i++) {
            const vehicleGroup = new THREE.Group();
            
            // Cart base
            const baseGeometry = new THREE.BoxGeometry(2, 0.8, 1.5);
            const baseMaterial = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
            const base = new THREE.Mesh(baseGeometry, baseMaterial);
            vehicleGroup.add(base);
            
            // Seats (2 rows of 2)
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 2; col++) {
                    const seatGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.4);
                    const seatMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
                    const seat = new THREE.Mesh(seatGeometry, seatMaterial);
                    seat.position.set(
                        -0.3 + col * 0.6,
                        0.7,
                        -0.3 + row * 0.6
                    );
                    vehicleGroup.add(seat);
                }
            }
            
            // Headlights
            const headlightGeometry = new THREE.SphereGeometry(0.1);
            const headlightMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffff00,
                emissive: 0xffff00 
            });
            const leftLight = new THREE.Mesh(headlightGeometry, headlightMaterial);
            leftLight.position.set(-0.7, 0.3, 0.8);
            vehicleGroup.add(leftLight);
            
            const rightLight = leftLight.clone();
            rightLight.position.x = 0.7;
            vehicleGroup.add(rightLight);
            
            // Add spotlight from headlights
            const spotlight = new THREE.SpotLight(0xffffff, 1, 10, Math.PI / 6);
            spotlight.position.set(0, 0.5, 0.8);
            spotlight.target.position.set(0, 0, 2);
            vehicleGroup.add(spotlight);
            vehicleGroup.add(spotlight.target);
            
            // Vehicle data
            vehicleGroup.userData = {
                id: i,
                occupied: false,
                currentProgress: 0,
                speed: 0.02,
                riders: []
            };
            
            // Position at station initially
            vehicleGroup.position.set(0, 1, i * 3);
            
            interior.add(vehicleGroup);
            rideSystem.rideVehicles.push(vehicleGroup);
        }
    }
    
    buildAllRideScenes(interior, rideSystem, basePos) {
        // Scene 1: Tomb Entry
        this.buildScene1TombEntry(interior, rideSystem);
        
        // Scene 2: Treasure Chamber
        this.buildScene2TreasureChamber(interior, rideSystem);
        
        // Scene 3: Mummy Awakening
        this.buildScene3MummyAwakening(interior, rideSystem);
        
        // Scene 4: Curse Chamber
        this.buildScene4CurseChamber(interior, rideSystem);
        
        // Scene 5: Escape Sequence
        this.buildScene5Escape(interior, rideSystem);
        
        // Scene 6: Finale
        this.buildScene6Finale(interior, rideSystem);
    }
    
    buildScene1TombEntry(interior, rideSystem) {
        const sceneGroup = new THREE.Group();
        sceneGroup.position.set(0, 0, -20);
        
        // Closing walls effect
        const wallLeft = new THREE.BoxGeometry(10, 8, 1);
        const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x8b7355 });
        const leftWall = new THREE.Mesh(wallLeft, wallMaterial);
        leftWall.position.set(-5, 4, 0);
        leftWall.userData.animationType = 'slideIn';
        sceneGroup.add(leftWall);
        
        const rightWall = leftWall.clone();
        rightWall.position.x = 5;
        sceneGroup.add(rightWall);
        
        // Stone door
        const doorGeometry = new THREE.BoxGeometry(6, 8, 0.5);
        const doorMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 4, -5);
        door.userData.animationType = 'doorOpen';
        sceneGroup.add(door);
        
        interior.add(sceneGroup);
    }
    
    buildScene2TreasureChamber(interior, rideSystem) {
        const sceneGroup = new THREE.Group();
        sceneGroup.position.set(20, -1, -20);
        
        // Gold piles
        for (let i = 0; i < 10; i++) {
            const goldGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.3);
            const goldMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffd700,
                shininess: 100 
            });
            const gold = new THREE.Mesh(goldGeometry, goldMaterial);
            gold.position.set(
                (Math.random() - 0.5) * 10,
                Math.random() * 2,
                (Math.random() - 0.5) * 10
            );
            sceneGroup.add(gold);
        }
        
        // Guardian statues
        for (let i = 0; i < 2; i++) {
            const statueGeometry = new THREE.BoxGeometry(1, 4, 1);
            const statueMaterial = new THREE.MeshPhongMaterial({ color: 0x8b7355 });
            const statue = new THREE.Mesh(statueGeometry, statueMaterial);
            statue.position.set(i === 0 ? -4 : 4, 2, 0);
            statue.userData.animationType = 'headTurn';
            sceneGroup.add(statue);
        }
        
        interior.add(sceneGroup);
    }
    
    buildScene3MummyAwakening(interior, rideSystem) {
        const sceneGroup = new THREE.Group();
        sceneGroup.position.set(10, -1, 5);
        
        // Sarcophagus
        const sarcGeometry = new THREE.BoxGeometry(3, 1.5, 7);
        const sarcMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
        const sarcophagus = new THREE.Mesh(sarcGeometry, sarcMaterial);
        sarcophagus.position.y = 0.75;
        sceneGroup.add(sarcophagus);
        
        // Mummy figure
        const mummyGroup = new THREE.Group();
        const mummyBody = new THREE.BoxGeometry(1, 2.5, 0.5);
        const mummyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x8b7355,
            opacity: 0.9,
            transparent: true
        });
        const mummy = new THREE.Mesh(mummyBody, mummyMaterial);
        mummy.position.y = 1.25;
        mummyGroup.add(mummy);
        
        // Mummy head
        const headGeometry = new THREE.SphereGeometry(0.4);
        const head = new THREE.Mesh(headGeometry, mummyMaterial);
        head.position.y = 2.8;
        mummyGroup.add(head);
        
        mummyGroup.position.y = -2; // Hidden initially
        mummyGroup.userData.animationType = 'mummyRise';
        sceneGroup.add(mummyGroup);
        
        interior.add(sceneGroup);
    }
    
    buildScene4CurseChamber(interior, rideSystem) {
        const sceneGroup = new THREE.Group();
        sceneGroup.position.set(0, -1, 10);
        
        // Rotating room walls with hieroglyphs
        const cylinderGeometry = new THREE.CylinderGeometry(8, 8, 6, 16, 1, true);
        const cylinderMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4a3c28,
            side: THREE.DoubleSide
        });
        const rotatingWalls = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        rotatingWalls.userData.animationType = 'rotate';
        sceneGroup.add(rotatingWalls);
        
        // Scarab beetles
        for (let i = 0; i < 20; i++) {
            const scarabGeometry = new THREE.SphereGeometry(0.2, 6, 4);
            const scarabMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x000000,
                shininess: 100 
            });
            const scarab = new THREE.Mesh(scarabGeometry, scarabMaterial);
            const angle = (i / 20) * Math.PI * 2;
            scarab.position.set(
                Math.cos(angle) * 7,
                Math.random() * 4 - 2,
                Math.sin(angle) * 7
            );
            scarab.userData.animationType = 'crawl';
            sceneGroup.add(scarab);
        }
        
        interior.add(sceneGroup);
    }
    
    buildScene5Escape(interior, rideSystem) {
        const sceneGroup = new THREE.Group();
        sceneGroup.position.set(-15, 1, 0);
        
        // Falling debris particles
        const debrisGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const debrisMaterial = new THREE.MeshPhongMaterial({ color: 0x8b7355 });
        
        for (let i = 0; i < 15; i++) {
            const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
            debris.position.set(
                (Math.random() - 0.5) * 10,
                5 + Math.random() * 3,
                (Math.random() - 0.5) * 10
            );
            debris.userData.animationType = 'fall';
            debris.userData.fallSpeed = 0.5 + Math.random() * 0.5;
            sceneGroup.add(debris);
        }
        
        // Fire effects on walls
        for (let i = 0; i < 6; i++) {
            const fireLight = new THREE.PointLight(0xff4500, 1, 5);
            const angle = (i / 6) * Math.PI * 2;
            fireLight.position.set(
                Math.cos(angle) * 6,
                1,
                Math.sin(angle) * 6
            );
            sceneGroup.add(fireLight);
        }
        
        interior.add(sceneGroup);
    }
    
    buildScene6Finale(interior, rideSystem) {
        const sceneGroup = new THREE.Group();
        sceneGroup.position.set(-5, 1, -5);
        
        // Calm treasury room
        const treasuryGeometry = new THREE.BoxGeometry(15, 8, 15);
        const treasuryMaterial = new THREE.MeshPhongMaterial({ 
            color: 0xdaa520,
            side: THREE.BackSide
        });
        const treasury = new THREE.Mesh(treasuryGeometry, treasuryMaterial);
        treasury.position.y = 4;
        sceneGroup.add(treasury);
        
        // Final mummy behind glass
        const glassGeometry = new THREE.BoxGeometry(4, 4, 0.2);
        const glassMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.3
        });
        const glass = new THREE.Mesh(glassGeometry, glassMaterial);
        glass.position.set(0, 2, -6);
        sceneGroup.add(glass);
        
        interior.add(sceneGroup);
    }
    
    updateMummyDarkRide(deltaTime, time) {
        // Find the Mummy dark ride
        const mummyInterior = this.buildings.find(b => b.name === 'mummyDarkRide');
        if (!mummyInterior || !mummyInterior.userData.rideSystem) return;
        
        const rideSystem = mummyInterior.userData.rideSystem;
        
        // Update each vehicle on the track
        rideSystem.rideVehicles.forEach((vehicle, index) => {
            const userData = vehicle.userData;
            
            // Check for boarding at station
            if (!userData.occupied && this.mina) {
                const distance = vehicle.position.distanceTo(this.mina.position);
                if (distance < 3 && userData.currentProgress < 0.01) {
                    // Show boarding prompt
                    if (!this.boardingPromptShown) {
                        console.log('🎢 Press E to board the Mummy Dark Ride!');
                        this.boardingPromptShown = true;
                    }
                    
                    // Check for boarding input
                    if (this.controls.forward || this.controls.run) {
                        this.boardMummyRide(vehicle, rideSystem);
                    }
                }
            }
            
            // Update vehicle movement along track
            if (userData.occupied || userData.currentProgress > 0) {
                userData.currentProgress += userData.speed * deltaTime;
                
                // Loop back to start
                if (userData.currentProgress >= 1) {
                    userData.currentProgress = 0;
                    userData.occupied = false;
                    
                    // Unload riders
                    if (userData.riders.includes(this.mina)) {
                        this.unboardMummyRide(vehicle, rideSystem);
                    }
                }
                
                // Get position along spline
                if (rideSystem.trackSpline) {
                    const point = rideSystem.trackSpline.getPoint(userData.currentProgress);
                    vehicle.position.copy(point);
                    
                    // Look ahead on track
                    const lookAhead = Math.min(userData.currentProgress + 0.01, 1);
                    const lookPoint = rideSystem.trackSpline.getPoint(lookAhead);
                    vehicle.lookAt(lookPoint);
                }
                
                // Trigger scene effects based on progress
                this.triggerRideSceneEffects(userData.currentProgress, rideSystem, time);
                
                // Vehicle animations
                vehicle.rotation.z = Math.sin(time * 4) * 0.02; // Gentle sway
                
                // Headlight flicker
                const headlights = vehicle.children.filter(c => c.type === 'SpotLight');
                headlights.forEach(light => {
                    light.intensity = 0.8 + Math.random() * 0.2;
                });
            }
        });
        
        // Animate scene elements
        this.animateDarkRideScenes(mummyInterior, time);
    }
    
    boardMummyRide(vehicle, rideSystem) {
        console.log('🎢 Boarding Mummy Dark Ride!');
        
        vehicle.userData.occupied = true;
        vehicle.userData.riders = [this.mina];
        vehicle.userData.currentProgress = 0;
        
        // Lock player to vehicle
        if (this.mina) {
            this.mina.userData.ridingVehicle = vehicle;
            this.mina.visible = false; // Hide character while riding
        }
        
        // Play boarding sound/animation
        this.playCharacterAnimation(this.mina, 'jumping', 1000);
        
        // Start dramatic music
        console.log('🎵 Starting ride music...');
        
        this.boardingPromptShown = false;
    }
    
    unboardMummyRide(vehicle, rideSystem) {
        console.log('🎢 Ride complete! Thanks for riding!');
        
        vehicle.userData.occupied = false;
        vehicle.userData.riders = [];
        
        // Unlock player from vehicle
        if (this.mina) {
            this.mina.userData.ridingVehicle = null;
            this.mina.visible = true;
            this.mina.position.copy(vehicle.position);
            this.mina.position.y = 1.35;
        }
        
        // Celebration animation
        this.playCharacterAnimation(this.mina, 'dancing', 2000);
        this.playCharacterAnimation(this.sacha, 'waving', 1500);
    }
    
    triggerRideSceneEffects(progress, rideSystem, time) {
        // Scene triggers based on track progress
        
        // Scene 1: Tomb Entry (5-15%)
        if (progress > 0.05 && progress < 0.15) {
            // Walls closing in effect
            // Door opening animation
        }
        
        // Scene 2: Treasure Chamber (20-30%)
        if (progress > 0.20 && progress < 0.30) {
            // Guardian statues turn heads
            // Gold sparkle effects
        }
        
        // Scene 3: Mummy Awakening (35-45%)
        if (progress > 0.35 && progress < 0.45) {
            // Mummy rises from sarcophagus
            // Strobe lighting
            if (Math.random() < 0.1) {
                console.log('⚡ MUMMY AWAKENS!');
            }
        }
        
        // Scene 4: Curse Chamber (50-60%)
        if (progress > 0.50 && progress < 0.60) {
            // Rotating walls
            // Scarab swarm
        }
        
        // Scene 5: Escape (65-75%)  
        if (progress > 0.65 && progress < 0.75) {
            // Falling debris
            // Fire effects
        }
        
        // Scene 6: Finale (80-95%)
        if (progress > 0.80 && progress < 0.95) {
            // Calm lighting
            // Final mummy scare
        }
    }
    
    animateDarkRideScenes(interior, time) {
        interior.traverse(object => {
            if (object.userData.animationType) {
                switch(object.userData.animationType) {
                    case 'rotate':
                        object.rotation.y += 0.01;
                        break;
                    case 'mummyRise':
                        if (object.position.y < 1.25) {
                            object.position.y += 0.01;
                        }
                        break;
                    case 'doorOpen':
                        if (object.position.y < 10) {
                            object.position.y += 0.05;
                        }
                        break;
                    case 'headTurn':
                        object.rotation.y = Math.sin(time) * 0.5;
                        break;
                    case 'fall':
                        object.position.y -= object.userData.fallSpeed * 0.01;
                        if (object.position.y < -2) {
                            object.position.y = 5 + Math.random() * 3;
                        }
                        break;
                    case 'crawl':
                        const angle = time * 2;
                        object.position.x += Math.sin(angle) * 0.01;
                        object.position.z += Math.cos(angle) * 0.01;
                        break;
                }
            }
        });
    }
    
    createHauntedInterior(parentRide) {
        const interior = new THREE.Group();
        interior.name = 'hauntedInterior';
        
        // Create spooky mansion interior - Victorian parlor
        const roomGeometry = new THREE.BoxGeometry(20, 10, 20);
        const roomMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2d1810,
            side: THREE.BackSide // Show inside faces
        });
        const room = new THREE.Mesh(roomGeometry, roomMaterial);
        room.position.set(parentRide.position.x, 5, parentRide.position.z);
        interior.add(room);
        
        // Add spooky floating candles
        for (let i = 0; i < 6; i++) {
            const candleGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.8);
            const candleMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
            const candle = new THREE.Mesh(candleGeometry, candleMaterial);
            
            const angle = (i / 6) * Math.PI * 2;
            candle.position.set(
                parentRide.position.x + Math.cos(angle) * 6,
                8 + Math.sin(Date.now() * 0.001 + i) * 0.5, // Floating animation
                parentRide.position.z + Math.sin(angle) * 6
            );
            
            // Flickering flame effect
            const flameGeometry = new THREE.SphereGeometry(0.2, 6, 6);
            const flameMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xff6600,
                transparent: true,
                opacity: 0.8
            });
            const flame = new THREE.Mesh(flameGeometry, flameMaterial);
            flame.position.y = 0.6;
            candle.add(flame);
            
            interior.add(candle);
        }
        
        // Add ghostly figures
        for (let i = 0; i < 3; i++) {
            const ghostGeometry = new THREE.SphereGeometry(0.8, 8, 8);
            const ghostMaterial = new THREE.MeshPhongMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.3
            });
            const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial);
            ghost.position.set(
                parentRide.position.x + (Math.random() - 0.5) * 12,
                3 + Math.random() * 3,
                parentRide.position.z + (Math.random() - 0.5) * 12
            );
            
            ghost.userData.floatOffset = Math.random() * Math.PI * 2;
            interior.add(ghost);
        }
        
        // Add treasure chest in the corner
        const chestGeometry = new THREE.BoxGeometry(2, 1, 1);
        const chestMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
        const chest = new THREE.Mesh(chestGeometry, chestMaterial);
        chest.position.set(
            parentRide.position.x + 7,
            1,
            parentRide.position.z + 7
        );
        
        // Golden glow around the chest
        const glowGeometry = new THREE.SphereGeometry(1.5, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffd700,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        chest.add(glow);
        
        interior.add(chest);
        
        interior.position.set(0, -50, 0); // Hidden below ground initially
        interior.userData = {
            type: 'interior',
            parentBuilding: parentRide,
            entryPosition: {
                x: parentRide.position.x,
                y: 1.35,
                z: parentRide.position.z + 5
            },
            exitPosition: {
                x: parentRide.position.x,
                y: 1.35,
                z: parentRide.position.z - 5
            },
            entranceRange: 5,
            name: 'Haunted Mansion Interior'
        };
        
        this.buildings.push(interior);
        this.scene.add(interior);
        
        console.log('👻 Created Haunted Mansion interior');
    }
    
    addBuildingEntrances() {
        // Add entrance markers for buildings
        const entranceGeometry = new THREE.RingGeometry(2, 2.5, 8);
        const entranceMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        this.rides.forEach(ride => {
            if (ride.userData.rideType === 'indoor' || ride.userData.rideType === 'haunted') {
                const entrance = new THREE.Mesh(entranceGeometry, entranceMaterial);
                entrance.position.copy(ride.position);
                entrance.position.y = 0.1;
                entrance.rotation.x = -Math.PI / 2;
                
                // Animate the entrance ring
                entrance.userData.animationOffset = Math.random() * Math.PI * 2;
                entrance.userData.type = 'entrance';
                entrance.userData.parentRide = ride;
                
                this.scene.add(entrance);
            }
        });
    }
    
    createRideVehicles() {
        console.log('🚗 Creating rideable vehicles...');
        
        // Create ride cars for different attractions
        const vehicleTypes = [
            { 
                rideType: 'indoor', 
                position: { x: -75, z: 5 }, 
                type: 'mummyCart',
                name: 'Mummy Adventure Cart'
            },
            { 
                rideType: 'rollercoaster', 
                position: { x: 75, z: -75 }, 
                type: 'coasterCar',
                name: 'Battlestar Fighter'
            },
            { 
                rideType: 'water', 
                position: { x: -75, z: -75 }, 
                type: 'raftBoat',
                name: 'Jurassic Raft'
            }
        ];
        
        vehicleTypes.forEach(vehicleData => {
            const vehicle = this.createRideVehicle(vehicleData);
            this.rideVehicles.push(vehicle);
            this.scene.add(vehicle);
        });
    }
    
    createRideVehicle(vehicleData) {
        const vehicleGroup = new THREE.Group();
        
        switch(vehicleData.type) {
            case 'mummyCart':
                // Ancient Egyptian-style cart
                const cartBase = new THREE.BoxGeometry(4, 1, 6);
                const cartMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
                const base = new THREE.Mesh(cartBase, cartMaterial);
                base.position.y = 0.5;
                base.castShadow = true;
                vehicleGroup.add(base);
                
                // Seats for the girls
                for (let i = 0; i < 2; i++) {
                    const seatGeometry = new THREE.BoxGeometry(1.5, 0.8, 1.5);
                    const seatMaterial = new THREE.MeshPhongMaterial({ color: 0x654321 });
                    const seat = new THREE.Mesh(seatGeometry, seatMaterial);
                    seat.position.set(i * 2 - 0.5, 1.4, 0);
                    seat.userData.seatId = i;
                    vehicleGroup.add(seat);
                }
                
                // Egyptian decorations
                const decorGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2);
                const decorMaterial = new THREE.MeshPhongMaterial({ color: 0xdaa520 });
                for (let i = 0; i < 4; i++) {
                    const decor = new THREE.Mesh(decorGeometry, decorMaterial);
                    decor.position.set(
                        i % 2 === 0 ? -1.8 : 1.8,
                        1.5,
                        i < 2 ? -2.5 : 2.5
                    );
                    vehicleGroup.add(decor);
                }
                break;
                
            case 'coasterCar':
                // Futuristic space fighter
                const fighterGeometry = new THREE.BoxGeometry(2.5, 1.2, 5);
                const fighterMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
                const fighter = new THREE.Mesh(fighterGeometry, fighterMaterial);
                fighter.position.y = 1;
                vehicleGroup.add(fighter);
                
                // Cockpit seats
                for (let i = 0; i < 2; i++) {
                    const cockpitGeometry = new THREE.SphereGeometry(0.8, 8, 6);
                    const cockpitMaterial = new THREE.MeshPhongMaterial({ 
                        color: 0x0066cc,
                        transparent: true,
                        opacity: 0.7
                    });
                    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
                    cockpit.position.set(0, 1.8, i * 2 - 0.5);
                    cockpit.userData.seatId = i;
                    vehicleGroup.add(cockpit);
                }
                break;
                
            case 'raftBoat':
                // Inflatable raft
                const raftGeometry = new THREE.CylinderGeometry(3, 3, 0.5, 8);
                const raftMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 });
                const raft = new THREE.Mesh(raftGeometry, raftMaterial);
                raft.position.y = 0.25;
                vehicleGroup.add(raft);
                
                // Seating area
                const seatingGeometry = new THREE.RingGeometry(1, 2.5, 8);
                const seatingMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
                const seating = new THREE.Mesh(seatingGeometry, seatingMaterial);
                seating.position.y = 0.6;
                seating.rotation.x = -Math.PI / 2;
                vehicleGroup.add(seating);
                break;
        }
        
        vehicleGroup.position.set(vehicleData.position.x, 0, vehicleData.position.z);
        vehicleGroup.userData = {
            type: 'rideVehicle',
            vehicleType: vehicleData.type,
            name: vehicleData.name,
            canRide: true,
            isOccupied: false,
            seats: vehicleData.type === 'mummyCart' || vehicleData.type === 'coasterCar' ? 2 : 4,
            interactionRange: 4,
            ridePath: [],
            rideActive: false,
            rideStartTime: 0
        };
        
        return vehicleGroup;
    }
    
    startWorldEvents() {
        console.log('🎪 Starting dynamic world events...');
        
        // Create periodic events
        this.worldEvents = [
            {
                name: 'Parade',
                type: 'moving',
                startTime: Date.now() + 10000, // Start in 10 seconds
                duration: 30000, // 30 seconds
                interval: 120000, // Every 2 minutes
                active: false,
                participants: []
            },
            {
                name: 'Fireworks',
                type: 'stationary',
                startTime: Date.now() + 60000, // Start in 1 minute
                duration: 15000, // 15 seconds
                interval: 180000, // Every 3 minutes
                active: false,
                position: { x: 0, y: 20, z: 0 }
            },
            {
                name: 'Character Meet',
                type: 'interactive',
                startTime: Date.now() + 30000, // Start in 30 seconds
                duration: 45000, // 45 seconds
                interval: 240000, // Every 4 minutes
                active: false,
                character: null
            }
        ];
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
        
        // Always setup mobile controls for debugging
        console.log('🔧 Force enabling mobile controls for all devices...');
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        console.log('🔧 Setting up Android-optimized mobile controls...');
        console.log('User Agent:', navigator.userAgent);
        console.log('Is Mobile:', this.isMobile);
        
        // Force show mobile controls always for debugging
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            mobileControls.style.display = 'block';
            mobileControls.style.opacity = '1';
            console.log('✅ Mobile controls container visible');
        } else {
            console.error('❌ Mobile controls container not found!');
            return;
        }
        
        // Get arrow button elements with detailed logging
        const buttons = {
            up: document.getElementById('upButton'),
            down: document.getElementById('downButton'),
            left: document.getElementById('leftButton'),
            right: document.getElementById('rightButton'),
            run: document.getElementById('runButton'),
            camera: document.getElementById('cameraButton')
        };
        
        console.log('Button elements found:', Object.keys(buttons).filter(key => buttons[key]));
        console.log('Missing buttons:', Object.keys(buttons).filter(key => !buttons[key]));
        
        // Universal event handler that works on both touch and mouse
        const createControlHandler = (controlName) => {
            return {
                start: (e) => {
                    console.log(`🎮 ${controlName} button pressed!`);
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    
                    // Force set the control
                    this.controls[controlName] = true;
                    console.log('Current controls:', this.controls);
                    
                    // Visual feedback
                    if (e.target) {
                        e.target.style.background = 'rgba(255,0,0,0.8)'; // Bright red for visibility
                        e.target.style.transform = 'scale(1.2)';
                    }
                },
                end: (e) => {
                    console.log(`🎮 ${controlName} button released!`);
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                    
                    this.controls[controlName] = false;
                    console.log('Current controls:', this.controls);
                    
                    // Reset visual feedback
                    if (e.target) {
                        e.target.style.background = 'rgba(0,0,0,0.4)';
                        e.target.style.transform = 'scale(1)';
                    }
                }
            };
        };
        
        // Setup movement controls with robust event binding
        const movements = [
            { button: buttons.up, control: 'forward' },
            { button: buttons.down, control: 'backward' },
            { button: buttons.left, control: 'left' },
            { button: buttons.right, control: 'right' }
        ];
        
        movements.forEach(({ button, control }) => {
            if (button) {
                const handler = createControlHandler(control);
                
                // Multiple event types for maximum compatibility
                const startEvents = ['touchstart', 'mousedown', 'pointerdown'];
                const endEvents = ['touchend', 'touchcancel', 'mouseup', 'mouseleave', 'pointerup', 'pointercancel'];
                
                startEvents.forEach(eventType => {
                    button.addEventListener(eventType, handler.start, { 
                        passive: false, 
                        capture: true 
                    });
                });
                
                endEvents.forEach(eventType => {
                    button.addEventListener(eventType, handler.end, { 
                        passive: false, 
                        capture: true 
                    });
                });
                
                console.log(`✅ Events bound to ${control} button`);
            } else {
                console.error(`❌ ${control} button not found!`);
            }
        });
        
        // Run button
        if (buttons.run) {
            const runHandler = createControlHandler('run');
            ['touchstart', 'mousedown'].forEach(event => {
                buttons.run.addEventListener(event, runHandler.start, { passive: false });
            });
            ['touchend', 'touchcancel', 'mouseup'].forEach(event => {
                buttons.run.addEventListener(event, runHandler.end, { passive: false });
            });
        }
        
        // Disable scrolling and zoom on mobile
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        
        // Prevent default behaviors
        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault(); // Prevent pinch zoom
            }
        }, { passive: false });
        
        // Force enable movement regardless of mouse lock for mobile
        this.mouseLocked = true; // Force enable movement
        
        console.log('🚀 Android-optimized mobile controls setup complete!');
        console.log('Final control state:', this.controls);
    }
    
    // Character Animation Functions
    playCharacterAnimation(character, animationType, duration = 2000) {
        if (!character || !character.userData || !character.userData.animations) {
            console.warn('Character missing animation data');
            return;
        }
        
        const animations = character.userData.animations;
        animations.currentState = animationType;
        animations.isAnimating = true;
        animations.animationDuration = duration;
        animations.time = 0;
        
        console.log(`🎭 Playing ${animationType} animation for ${character.userData.name}`);
        
        // Auto-reset to idle after duration
        setTimeout(() => {
            if (animations.currentState === animationType) {
                animations.currentState = 'idle';
                animations.isAnimating = false;
            }
        }, duration);
    }
    
    updateCharacterAnimations(character, deltaTime) {
        if (!character || !character.userData || !character.userData.animations) return;
        
        const animations = character.userData.animations;
        const bodyParts = character.userData.bodyParts;
        const time = this.clock.getElapsedTime();
        
        // Update animation time
        animations.idle.time += deltaTime * animations.idle.speed;
        animations.walking.time += deltaTime * animations.walking.speed;
        animations.jumping.time += deltaTime * animations.jumping.speed;
        animations.scared.time += deltaTime * animations.scared.speed;
        animations.laughing.time += deltaTime * animations.laughing.speed;
        animations.waving.time += deltaTime * animations.waving.speed;
        animations.dancing.time += deltaTime * animations.dancing.speed;
        
        // Apply current animation
        switch (animations.currentState) {
            case 'laughing':
                this.animateLaughing(character, bodyParts, animations.laughing.time);
                break;
            case 'jumping':
                this.animateJumping(character, bodyParts, animations.jumping.time);
                break;
            case 'scared':
                this.animateScared(character, bodyParts, animations.scared.time);
                break;
            case 'walking':
                this.animateWalking(character, bodyParts, animations.walking.time);
                break;
            case 'waving':
                this.animateWaving(character, bodyParts, animations.waving.time);
                break;
            case 'dancing':
                this.animateDancing(character, bodyParts, animations.dancing.time);
                break;
            default: // idle
                this.animateIdle(character, bodyParts, animations.idle.time);
                break;
        }
    }
    
    animateLaughing(character, bodyParts, time) {
        if (!bodyParts) return;
        
        // Head bobbing up and down
        if (bodyParts.head) {
            bodyParts.head.position.y = 0.75 + Math.sin(time * 8) * 0.05;
            bodyParts.head.rotation.z = Math.sin(time * 6) * 0.1;
        }
        
        // Body shaking slightly
        if (bodyParts.body) {
            bodyParts.body.rotation.z = Math.sin(time * 10) * 0.03;
        }
        
        // Arms moving up and down
        if (bodyParts.leftUpperArm) {
            bodyParts.leftUpperArm.rotation.z = 0.3 + Math.sin(time * 8) * 0.2;
        }
        if (bodyParts.rightUpperArm) {
            bodyParts.rightUpperArm.rotation.z = -0.3 - Math.sin(time * 8) * 0.2;
        }
    }
    
    animateJumping(character, bodyParts, time) {
        // Character jumps up and down
        const jumpHeight = Math.abs(Math.sin(time * 4)) * 1.5;
        character.position.y = character.userData.animations.originalY + jumpHeight;
        
        // Arms spread wide during jump
        if (bodyParts.leftUpperArm) {
            bodyParts.leftUpperArm.rotation.z = 0.5 + Math.sin(time * 4) * 0.3;
        }
        if (bodyParts.rightUpperArm) {
            bodyParts.rightUpperArm.rotation.z = -0.5 - Math.sin(time * 4) * 0.3;
        }
        
        // Slight body lean
        if (bodyParts.body) {
            bodyParts.body.rotation.x = Math.sin(time * 4) * 0.1;
        }
    }
    
    animateScared(character, bodyParts, time) {
        // Quick trembling motion
        const tremble = Math.sin(time * 25) * 0.02;
        character.position.x += tremble;
        character.position.z += tremble * 0.5;
        
        // Head looking around frantically
        if (bodyParts.head) {
            bodyParts.head.rotation.y = Math.sin(time * 12) * 0.3;
            bodyParts.head.position.y = 0.73; // Slightly ducked
        }
        
        // Arms close to body, defensive
        if (bodyParts.leftUpperArm) {
            bodyParts.leftUpperArm.rotation.z = 0.8 + Math.sin(time * 15) * 0.1;
        }
        if (bodyParts.rightUpperArm) {
            bodyParts.rightUpperArm.rotation.z = -0.8 - Math.sin(time * 15) * 0.1;
        }
        
        // Body hunched forward
        if (bodyParts.body) {
            bodyParts.body.rotation.x = 0.2 + Math.sin(time * 10) * 0.05;
        }
    }
    
    animateWalking(character, bodyParts, time) {
        // Walking arm swing
        if (bodyParts.leftUpperArm) {
            bodyParts.leftUpperArm.rotation.x = Math.sin(time * 6) * 0.5;
        }
        if (bodyParts.rightUpperArm) {
            bodyParts.rightUpperArm.rotation.x = Math.sin(time * 6 + Math.PI) * 0.5;
        }
        
        // Walking head bob
        if (bodyParts.head) {
            bodyParts.head.position.y = 0.75 + Math.sin(time * 12) * 0.02;
        }
    }
    
    animateIdle(character, bodyParts, time) {
        // Gentle breathing motion
        if (bodyParts.body) {
            bodyParts.body.scale.y = 1 + Math.sin(time * 2) * 0.02;
        }
        
        // Slight head movement
        if (bodyParts.head) {
            bodyParts.head.rotation.y = Math.sin(time * 0.5) * 0.05;
            bodyParts.head.position.y = 0.75 + Math.sin(time * 1.5) * 0.01;
        }
    }
    
    animateWaving(character, bodyParts, time) {
        if (!bodyParts) return;
        
        // Friendly waving motion with right arm
        if (bodyParts.rightUpperArm) {
            bodyParts.rightUpperArm.rotation.z = -0.5 + Math.sin(time * 8) * 0.4;
            bodyParts.rightUpperArm.rotation.x = Math.sin(time * 6) * 0.2;
        }
        
        // Corresponding forearm movement
        if (bodyParts.rightForearm) {
            bodyParts.rightForearm.rotation.z = -0.3 + Math.sin(time * 8) * 0.3;
        }
        
        // Hand motion
        if (bodyParts.rightHand) {
            bodyParts.rightHand.rotation.z = Math.sin(time * 10) * 0.2;
        }
        
        // Slight head turn toward waving
        if (bodyParts.head) {
            bodyParts.head.rotation.y = Math.sin(time * 4) * 0.1;
            bodyParts.head.position.y = 0.75 + Math.sin(time * 3) * 0.02;
        }
        
        // Body sway
        if (bodyParts.body) {
            bodyParts.body.rotation.z = Math.sin(time * 4) * 0.05;
        }
    }
    
    animateDancing(character, bodyParts, time) {
        if (!bodyParts) return;
        
        // Bouncy up and down movement
        const bounceHeight = Math.sin(time * 6) * 0.3;
        character.position.y = character.userData.animations.originalY + Math.abs(bounceHeight);
        
        // Both arms moving rhythmically
        if (bodyParts.leftUpperArm) {
            bodyParts.leftUpperArm.rotation.z = 0.3 + Math.sin(time * 5) * 0.4;
            bodyParts.leftUpperArm.rotation.x = Math.sin(time * 4 + Math.PI) * 0.3;
        }
        if (bodyParts.rightUpperArm) {
            bodyParts.rightUpperArm.rotation.z = -0.3 - Math.sin(time * 5) * 0.4;
            bodyParts.rightUpperArm.rotation.x = Math.sin(time * 4) * 0.3;
        }
        
        // Forearms following the beat
        if (bodyParts.leftForearm) {
            bodyParts.leftForearm.rotation.z = 0.2 + Math.sin(time * 6) * 0.2;
        }
        if (bodyParts.rightForearm) {
            bodyParts.rightForearm.rotation.z = -0.2 - Math.sin(time * 6) * 0.2;
        }
        
        // Head bobbing to the rhythm
        if (bodyParts.head) {
            bodyParts.head.position.y = 0.75 + Math.sin(time * 6) * 0.08;
            bodyParts.head.rotation.z = Math.sin(time * 4) * 0.15;
            bodyParts.head.rotation.y = Math.sin(time * 3) * 0.2;
        }
        
        // Body twist and sway
        if (bodyParts.body) {
            bodyParts.body.rotation.y = Math.sin(time * 4) * 0.2;
            bodyParts.body.rotation.z = Math.sin(time * 5) * 0.1;
        }
    }
    
    checkMonsterReactions() {
        if (!this.mina) return;
        
        this.monsters.forEach(monster => {
            const distanceToMina = monster.position.distanceTo(this.mina.position);
            
            // If monster is close, trigger scared animation
            if (distanceToMina < 15 && Math.random() < 0.02) { // 2% chance per frame when close
                this.playCharacterAnimation(this.mina, 'scared', 1500);
                this.playCharacterAnimation(this.sacha, 'scared', 1500);
                
                // Add some random reactions
                if (Math.random() < 0.3) {
                    setTimeout(() => {
                        this.playCharacterAnimation(this.mina, 'jumping', 1000);
                    }, 800);
                }
            }
        });
        
        // Random animations when no monsters nearby
        if (this.gameState.monstersNearby === 0 && Math.random() < 0.001) { // 0.1% chance per frame
            const animations = ['laughing', 'waving', 'dancing'];
            const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
            
            if (Math.random() > 0.5) {
                this.playCharacterAnimation(this.mina, randomAnimation, 2500);
                // Sacha might join in with dancing or waving
                if (randomAnimation === 'dancing' && Math.random() > 0.6) {
                    setTimeout(() => {
                        this.playCharacterAnimation(this.sacha, 'dancing', 2000);
                    }, 500);
                } else if (randomAnimation === 'waving' && Math.random() > 0.7) {
                    setTimeout(() => {
                        this.playCharacterAnimation(this.sacha, 'waving', 1500);
                    }, 800);
                }
            } else {
                this.playCharacterAnimation(this.sacha, randomAnimation, 2500);
                // Mina might respond to Sacha's actions
                if (randomAnimation === 'dancing' && Math.random() > 0.6) {
                    setTimeout(() => {
                        this.playCharacterAnimation(this.mina, 'dancing', 2000);
                    }, 300);
                }
            }
        }
        
        // Jumping when collecting treasures (triggered elsewhere)
        // This function is called from treasure collection
    }
    
    // ===== DYNAMIC WORLD UPDATE FUNCTIONS =====
    
    updateInteractiveNPCs(deltaTime) {
        if (!this.mina) return;
        
        this.interactiveNPCs.forEach(npc => {
            const distance = npc.position.distanceTo(this.mina.position);
            
            // Check if girls are close enough for interaction
            if (distance < npc.userData.interactionRange) {
                const now = Date.now();
                
                // Only interact every 5 seconds to avoid spam
                if (now - npc.userData.lastInteraction > 5000) {
                    npc.userData.lastInteraction = now;
                    
                    // Show dialogue from this NPC
                    const dialogue = npc.userData.dialogues[npc.userData.currentDialogue];
                    this.showNPCDialogue(npc.userData.name, dialogue);
                    
                    // Cycle through dialogues
                    npc.userData.currentDialogue = 
                        (npc.userData.currentDialogue + 1) % npc.userData.dialogues.length;
                    
                    // Make characters react
                    if (npc.userData.personality === 'photographer') {
                        this.playCharacterAnimation(this.mina, 'laughing', 1500);
                        this.playCharacterAnimation(this.sacha, 'jumping', 1000);
                    } else if (npc.userData.personality === 'vendor') {
                        this.playCharacterAnimation(this.mina, 'jumping', 1000);
                    }
                }
            }
            
            // NPCs look at nearby characters
            if (distance < 15) {
                npc.lookAt(this.mina.position);
            }
            
            // Simple idle animation for NPCs
            const time = this.clock.getElapsedTime();
            npc.position.y = Math.sin(time * 2 + npc.position.x) * 0.02;
        });
    }
    
    updateCrowds(deltaTime) {
        this.crowds.forEach(crowd => {
            crowd.forEach(person => {
                const userData = person.userData;
                const time = this.clock.getElapsedTime();
                
                // Change direction occasionally
                userData.directionChangeTime += deltaTime;
                if (userData.directionChangeTime > 3 + Math.random() * 4) {
                    userData.direction = Math.random() * Math.PI * 2;
                    userData.directionChangeTime = 0;
                }
                
                // Move in current direction
                const speed = userData.baseSpeed * (0.8 + Math.random() * 0.4);
                const moveX = Math.cos(userData.direction) * speed * deltaTime;
                const moveZ = Math.sin(userData.direction) * speed * deltaTime;
                
                // Keep within group bounds
                const newX = person.position.x + moveX;
                const newZ = person.position.z + moveZ;
                const centerDistance = Math.sqrt(
                    Math.pow(newX - userData.groupCenter.x, 2) + 
                    Math.pow(newZ - userData.groupCenter.z, 2)
                );
                
                if (centerDistance < userData.groupRadius) {
                    person.position.x = newX;
                    person.position.z = newZ;
                    
                    // Face movement direction
                    person.rotation.y = userData.direction;
                } else {
                    // Turn towards group center
                    userData.direction = Math.atan2(
                        userData.groupCenter.z - person.position.z,
                        userData.groupCenter.x - person.position.x
                    );
                }
                
                // Simple walking animation
                person.position.y = Math.sin(time * userData.walkSpeed * 8) * 0.03;
                
                // Avoid getting too close to Mina and Sacha
                if (this.mina) {
                    const distanceToMina = person.position.distanceTo(this.mina.position);
                    if (distanceToMina < 3) {
                        const avoidDirection = Math.atan2(
                            person.position.z - this.mina.position.z,
                            person.position.x - this.mina.position.x
                        );
                        person.position.x += Math.cos(avoidDirection) * deltaTime * 2;
                        person.position.z += Math.sin(avoidDirection) * deltaTime * 2;
                    }
                }
            });
        });
    }
    
    updateRides(deltaTime) {
        const time = this.clock.getElapsedTime();
        
        this.rides.forEach(ride => {
            const userData = ride.userData;
            
            // Animate rides based on type
            switch(userData.rideType) {
                case 'rollercoaster':
                    // Track pieces moving up and down
                    ride.children.forEach((piece, index) => {
                        if (piece.geometry.type === 'BoxGeometry') {
                            piece.position.y = 1 + index * 0.5 + Math.sin(time * 2 + index) * 0.2;
                        }
                    });
                    break;
                    
                case 'indoor':
                    // Pyramid rotating slowly
                    const pyramid = ride.children.find(child => child.geometry.type === 'ConeGeometry');
                    if (pyramid) {
                        pyramid.rotation.y += deltaTime * 0.5;
                    }
                    break;
                    
                case 'family':
                    // Tower swaying gently
                    const tower = ride.children.find(child => child.geometry.type === 'CylinderGeometry');
                    if (tower) {
                        tower.rotation.z = Math.sin(time * 1.5) * 0.05;
                    }
                    break;
                    
                case 'water':
                    // Water splash animation
                    const splash = ride.children.find(child => 
                        child.material && child.material.transparent
                    );
                    if (splash) {
                        splash.scale.y = 0.3 + Math.sin(time * 3) * 0.2;
                        splash.material.opacity = 0.4 + Math.sin(time * 2) * 0.2;
                    }
                    break;
            }
            
            // Check for ride interaction
            if (this.mina && ride.position.distanceTo(this.mina.position) < userData.interactionRange) {
                const now = Date.now();
                if (now - userData.lastActivation > 10000) { // Every 10 seconds
                    userData.lastActivation = now;
                    this.triggerRideEffect(ride);
                }
            }
        });
    }
    
    updateWorldEvents(deltaTime) {
        const now = Date.now();
        
        this.worldEvents.forEach(event => {
            // Check if event should start
            if (!event.active && now >= event.startTime) {
                this.startWorldEvent(event);
            }
            
            // Check if event should end
            if (event.active && now >= event.startTime + event.duration) {
                this.endWorldEvent(event);
                // Schedule next occurrence
                event.startTime = now + event.interval;
            }
            
            // Update active events
            if (event.active) {
                this.updateActiveEvent(event, deltaTime);
            }
        });
    }
    
    showNPCDialogue(npcName, text) {
        // Create a special NPC speech bubble
        if (this.speechSystem.currentBubble) {
            this.removeSpeechBubble();
        }
        
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble npc';
        bubble.innerHTML = `<strong>${npcName}:</strong><br>${text}`;
        bubble.style.background = 'linear-gradient(45deg, #ffd700, #ffed4e)';
        bubble.style.color = '#333';
        bubble.style.display = 'none';
        
        document.body.appendChild(bubble);
        this.speechSystem.currentBubble = bubble;
        
        // Position at top center of screen
        bubble.style.position = 'fixed';
        bubble.style.top = '20px';
        bubble.style.left = '50%';
        bubble.style.transform = 'translateX(-50%)';
        bubble.style.display = 'block';
        bubble.style.zIndex = '200';
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (this.speechSystem.currentBubble === bubble) {
                this.removeSpeechBubble();
            }
        }, 4000);
    }
    
    triggerRideEffect(ride) {
        const rideName = ride.userData.name;
        
        // Visual and animation effects based on ride type
        switch(ride.userData.rideType) {
            case 'rollercoaster':
                this.playCharacterAnimation(this.mina, 'scared', 2000);
                this.playCharacterAnimation(this.sacha, 'jumping', 1500);
                this.showNPCDialogue('Ride Operator', 'Hold on tight for Battlestar Galactica!');
                break;
                
            case 'indoor':
                this.playCharacterAnimation(this.mina, 'scared', 3000);
                this.playCharacterAnimation(this.sacha, 'scared', 3000);
                this.showNPCDialogue('Mummy Guide', 'Welcome to the tomb... if you dare!');
                break;
                
            case 'family':
                this.playCharacterAnimation(this.mina, 'laughing', 2000);
                this.playCharacterAnimation(this.sacha, 'laughing', 2000);
                this.showNPCDialogue('Princess Fiona', 'Welcome to our magical 4-D adventure!');
                break;
                
            case 'water':
                this.playCharacterAnimation(this.mina, 'jumping', 1500);
                this.playCharacterAnimation(this.sacha, 'laughing', 2000);
                this.showNPCDialogue('Park Ranger', 'Watch out for the dinosaurs!');
                break;
        }
    }
    
    startWorldEvent(event) {
        event.active = true;
        console.log(`🎉 Starting world event: ${event.name}`);
        
        switch(event.name) {
            case 'Parade':
                this.showNPCDialogue('Parade Announcer', '🎊 The Universal Studios parade is starting!');
                break;
                
            case 'Fireworks':
                this.showNPCDialogue('Show Director', '🎆 Look up! Spectacular fireworks show!');
                // Trigger happy animations
                this.playCharacterAnimation(this.mina, 'jumping', 5000);
                this.playCharacterAnimation(this.sacha, 'laughing', 5000);
                break;
                
            case 'Character Meet':
                this.showNPCDialogue('Mickey Mouse', '🐭 Hi there! Want to take a photo with me?');
                this.playCharacterAnimation(this.mina, 'laughing', 3000);
                this.playCharacterAnimation(this.sacha, 'jumping', 3000);
                break;
        }
    }
    
    endWorldEvent(event) {
        event.active = false;
        console.log(`🎉 Ending world event: ${event.name}`);
    }
    
    updateActiveEvent(event, deltaTime) {
        // Event-specific updates while active
        switch(event.name) {
            case 'Fireworks':
                // Create sparkle effects
                if (Math.random() < 0.3) {
                    this.createTemporarySparkle();
                }
                break;
        }
    }
    
    createTemporarySparkle() {
        const sparkleGeometry = new THREE.SphereGeometry(0.1, 6, 4);
        const sparkleMaterial = new THREE.MeshBasicMaterial({ 
            color: Math.random() * 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
        
        sparkle.position.set(
            (Math.random() - 0.5) * 40,
            15 + Math.random() * 10,
            (Math.random() - 0.5) * 40
        );
        
        this.scene.add(sparkle);
        
        // Remove after 2 seconds
        setTimeout(() => {
            this.scene.remove(sparkle);
            sparkleGeometry.dispose();
            sparkleMaterial.dispose();
        }, 2000);
    }
    
    // ===== BUILDING INTERIOR & RIDE VEHICLE UPDATE FUNCTIONS =====
    
    updateBuildingInteriors(deltaTime) {
        if (!this.mina) return;
        
        // Check for building entrance/exit
        this.buildings.forEach(building => {
            if (building.userData.type === 'interior') {
                const parentBuilding = building.userData.parentBuilding;
                const distance = this.mina.position.distanceTo(parentBuilding.position);
                
                // Check if player wants to enter building
                if (distance < building.userData.entranceRange && !this.currentInterior) {
                    if (this.controls.forward || this.controls.run) {
                        this.enterBuilding(building);
                    }
                }
                
                // If inside, check for exit
                if (this.currentInterior === building) {
                    const interiorCenter = building.position.clone();
                    interiorCenter.y = this.mina.position.y;
                    const interiorDistance = this.mina.position.distanceTo(interiorCenter);
                    
                    // Exit if player moves too far from center or presses run
                    if (interiorDistance > 12 || this.controls.run) {
                        this.exitBuilding();
                    }
                }
            }
        });
        
        // Update entrance ring animations
        this.scene.traverse(object => {
            if (object.userData.type === 'entrance') {
                const time = this.clock.getElapsedTime();
                object.rotation.z = time + object.userData.animationOffset;
                object.material.opacity = 0.2 + Math.sin(time * 2) * 0.2;
            }
        });
    }
    
    updateRideVehicles(deltaTime) {
        if (!this.mina) return;
        
        const time = this.clock.getElapsedTime();
        
        // Update Mummy Dark Ride vehicles
        this.updateMummyDarkRide(deltaTime, time);
        
        this.rideVehicles.forEach(vehicle => {
            const userData = vehicle.userData;
            const distance = vehicle.position.distanceTo(this.mina.position);
            
            // Check for ride interaction
            if (distance < userData.interactionRange && !userData.isOccupied) {
                if (this.controls.forward || this.controls.run) {
                    this.startRideExperience(vehicle);
                }
            }
            
            // Update active rides
            if (userData.rideActive) {
                this.updateRideMotion(vehicle, deltaTime);
            }
            
            // Visual animations for vehicles
            switch(userData.vehicleType) {
                case 'mummyCart':
                    // Gentle swaying motion
                    vehicle.rotation.z = Math.sin(time * 1.5) * 0.02;
                    vehicle.position.y = Math.sin(time * 2) * 0.05;
                    break;
                    
                case 'coasterCar':
                    // Hovering effect
                    vehicle.position.y = 0.5 + Math.sin(time * 3) * 0.1;
                    // Cockpit glow
                    vehicle.children.forEach(child => {
                        if (child.material && child.material.transparent) {
                            child.material.opacity = 0.5 + Math.sin(time * 4) * 0.2;
                        }
                    });
                    break;
                    
                case 'raftBoat':
                    // Floating on water motion
                    vehicle.rotation.x = Math.sin(time * 1.8) * 0.05;
                    vehicle.rotation.z = Math.cos(time * 1.2) * 0.03;
                    vehicle.position.y = Math.sin(time * 2.5) * 0.08;
                    break;
            }
        });
    }
    
    enterBuilding(building) {
        console.log(`🏺 Entering ${building.userData.name}`);
        
        // Hide exterior world
        this.scene.traverse(object => {
            if (object !== building && object.parent === this.scene) {
                object.visible = false;
            }
        });
        
        // Show interior
        building.visible = true;
        this.currentInterior = building;
        
        // Move characters to interior
        const interiorCenter = building.position.clone();
        this.mina.position.copy(interiorCenter);
        this.mina.position.y = 1;
        
        if (this.sacha) {
            this.sacha.position.copy(interiorCenter);
            this.sacha.position.x += 2;
            this.sacha.position.y = 1;
        }
        
        // Show entry message
        this.showNPCDialogue('Tomb Guide', 'Welcome to the ancient tomb! Explore and find treasures!');
        
        // Make characters react with excitement
        this.playCharacterAnimation(this.mina, 'jumping', 2000);
        this.playCharacterAnimation(this.sacha, 'scared', 1500);
    }
    
    exitBuilding() {
        if (!this.currentInterior) return;
        
        console.log(`🏺 Exiting ${this.currentInterior.userData.name}`);
        
        // Hide interior
        this.currentInterior.visible = false;
        
        // Show exterior world
        this.scene.traverse(object => {
            if (object.parent === this.scene) {
                object.visible = true;
            }
        });
        
        // Move characters back outside
        const exitPosition = this.currentInterior.userData.parentBuilding.position.clone();
        exitPosition.z += 8; // Outside the building
        this.mina.position.copy(exitPosition);
        this.mina.position.y = 1;
        
        if (this.sacha) {
            this.sacha.position.copy(exitPosition);
            this.sacha.position.x += 2;
            this.sacha.position.y = 1;
        }
        
        this.currentInterior = null;
        
        this.showNPCDialogue('Tomb Guide', 'Come back anytime for more adventures!');
    }
    
    startRideExperience(vehicle) {
        const userData = vehicle.userData;
        if (userData.isOccupied || userData.rideActive) return;
        
        console.log(`🎢 Starting ride: ${userData.name}`);
        
        userData.isOccupied = true;
        userData.rideActive = true;
        userData.rideStartTime = Date.now();
        
        // Move characters onto the ride
        this.mina.position.copy(vehicle.position);
        this.mina.position.y += 2;
        this.mina.parent = vehicle; // Attach to vehicle
        
        if (this.sacha) {
            this.sacha.position.copy(vehicle.position);
            this.sacha.position.x += 1.5;
            this.sacha.position.y += 2;
            this.sacha.parent = vehicle; // Attach to vehicle
        }
        
        // Create ride path based on vehicle type
        this.createRidePath(vehicle);
        
        // Show ride start message and character reactions
        switch(userData.vehicleType) {
            case 'mummyCart':
                this.showNPCDialogue('Ride Operator', 'Hold on tight! The mummy adventure begins!');
                this.playCharacterAnimation(this.mina, 'scared', 3000);
                this.playCharacterAnimation(this.sacha, 'jumping', 2000);
                break;
                
            case 'coasterCar':
                this.showNPCDialogue('Flight Commander', 'Pilots ready! Launching Battlestar fighters!');
                this.playCharacterAnimation(this.mina, 'jumping', 4000);
                this.playCharacterAnimation(this.sacha, 'laughing', 3000);
                break;
                
            case 'raftBoat':
                this.showNPCDialogue('River Guide', 'Welcome aboard! Watch out for dinosaurs!');
                this.playCharacterAnimation(this.mina, 'laughing', 3000);
                this.playCharacterAnimation(this.sacha, 'jumping', 2500);
                break;
        }
        
        // End ride after duration
        setTimeout(() => {
            this.endRideExperience(vehicle);
        }, 15000); // 15 second ride
    }
    
    createRidePath(vehicle) {
        const userData = vehicle.userData;
        const startPos = vehicle.position.clone();
        userData.ridePath = [];
        userData.pathIndex = 0;
        
        // Create different paths for different ride types
        switch(userData.vehicleType) {
            case 'mummyCart':
                // Circular path around the tomb area
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2;
                    userData.ridePath.push({
                        x: startPos.x + Math.cos(angle) * 15,
                        y: startPos.y + Math.sin(i * 0.5) * 2,
                        z: startPos.z + Math.sin(angle) * 15
                    });
                }
                break;
                
            case 'coasterCar':
                // High-speed loop with elevation changes
                for (let i = 0; i < 30; i++) {
                    const angle = (i / 30) * Math.PI * 4; // 2 full loops
                    userData.ridePath.push({
                        x: startPos.x + Math.cos(angle) * 20,
                        y: startPos.y + Math.sin(i * 0.3) * 8 + 5, // Higher elevation
                        z: startPos.z + Math.sin(angle) * 20
                    });
                }
                break;
                
            case 'raftBoat':
                // Winding river path
                for (let i = 0; i < 25; i++) {
                    const t = i / 25;
                    userData.ridePath.push({
                        x: startPos.x + Math.sin(t * Math.PI * 3) * 18,
                        y: startPos.y + Math.random() * 0.5, // Small height variation
                        z: startPos.z + (t - 0.5) * 35
                    });
                }
                break;
        }
    }
    
    updateRideMotion(vehicle, deltaTime) {
        const userData = vehicle.userData;
        const rideDuration = Date.now() - userData.rideStartTime;
        
        if (userData.ridePath.length === 0) return;
        
        // Calculate progress through ride (0 to 1)
        const progress = Math.min(rideDuration / 15000, 1); // 15 second ride
        const targetIndex = Math.floor(progress * userData.ridePath.length);
        
        if (targetIndex < userData.ridePath.length) {
            const targetPos = userData.ridePath[targetIndex];
            
            // Smooth movement to next point
            vehicle.position.lerp(new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z), deltaTime * 3);
            
            // Add ride-specific effects
            switch(userData.vehicleType) {
                case 'mummyCart':
                    vehicle.rotation.y = Math.atan2(
                        userData.ridePath[(targetIndex + 1) % userData.ridePath.length].x - targetPos.x,
                        userData.ridePath[(targetIndex + 1) % userData.ridePath.length].z - targetPos.z
                    );
                    break;
                    
                case 'coasterCar':
                    // Banking on turns
                    vehicle.rotation.z = Math.sin(progress * Math.PI * 8) * 0.3;
                    break;
                    
                case 'raftBoat':
                    // Splashing motion
                    vehicle.rotation.x = Math.sin(progress * 20) * 0.1;
                    break;
            }
        }
    }
    
    endRideExperience(vehicle) {
        const userData = vehicle.userData;
        
        console.log(`🎢 Ending ride: ${userData.name}`);
        
        userData.isOccupied = false;
        userData.rideActive = false;
        userData.ridePath = [];
        
        // Detach characters from vehicle and move them near the exit
        if (this.mina.parent === vehicle) {
            this.scene.add(this.mina);
            this.mina.position.copy(vehicle.position);
            this.mina.position.z += 5; // Move away from vehicle
            this.mina.position.y = 1;
        }
        
        if (this.sacha && this.sacha.parent === vehicle) {
            this.scene.add(this.sacha);
            this.sacha.position.copy(vehicle.position);
            this.sacha.position.x += 2;
            this.sacha.position.z += 5;
            this.sacha.position.y = 1;
        }
        
        // Return vehicle to starting position
        setTimeout(() => {
            vehicle.position.set(
                userData.vehicleType === 'mummyCart' ? -75 : 
                userData.vehicleType === 'coasterCar' ? 75 : -75,
                0,
                userData.vehicleType === 'mummyCart' ? 5 : 
                userData.vehicleType === 'coasterCar' ? -75 : -75
            );
            vehicle.rotation.set(0, 0, 0);
        }, 2000);
        
        // Show ride completion message
        this.showNPCDialogue('Ride Operator', 'Thanks for riding! Come back anytime!');
        this.playCharacterAnimation(this.mina, 'laughing', 3000);
        this.playCharacterAnimation(this.sacha, 'jumping', 2000);
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
            console.log('Mina object:', this.mina);
            console.log('Available objects:', Object.keys(this));
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
            
            // Set walking animation state
            if (this.mina.userData && this.mina.userData.animations) {
                this.mina.userData.animations.currentState = 'walking';
            }
            
            // Animate Mina's limbs while walking
            this.animateMinaWalking(time);
        } else {
            // Set idle animation state when not moving
            if (this.mina.userData && this.mina.userData.animations) {
                this.mina.userData.animations.currentState = 'idle';
            }
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
        
        // Dynamic camera system for cinematic feel
        const time = this.clock.getElapsedTime();
        const isMoving = this.controls.forward || this.controls.backward || this.controls.left || this.controls.right;
        
        // Dynamic distance and height based on movement and monsters
        let baseCameraDistance = 12; // Further back for cinematic view
        let baseCameraHeight = 6;    // Higher for dramatic angle
        
        // Camera gets closer when monsters are nearby for tension
        if (this.gameState.monstersNearby > 0) {
            baseCameraDistance = Math.max(8, baseCameraDistance - this.gameState.monstersNearby * 2);
            baseCameraHeight = Math.max(4, baseCameraHeight - this.gameState.monstersNearby * 0.5);
        }
        
        // Slight camera shake when scared
        let shakeX = 0, shakeZ = 0;
        if (this.mina.userData?.animations?.currentState === 'scared') {
            shakeX = Math.sin(time * 30) * 0.5;
            shakeZ = Math.cos(time * 25) * 0.3;
        }
        
        // Smooth camera sway when moving for cinematic feel
        let cinematicSway = 0;
        if (isMoving) {
            cinematicSway = Math.sin(time * 2) * 0.1; // Gentle sway
        }
        
        // Dynamic camera offset for more interesting angles
        const cameraDistance = baseCameraDistance + Math.sin(time * 0.5) * 1; // Breathing distance
        const cameraHeight = baseCameraHeight + Math.sin(time * 0.3) * 0.5;   // Subtle height variation
        
        // Calculate camera position with cinematic enhancements
        const x = this.mina.position.x + 
                  cameraDistance * Math.sin(this.cameraRotation.horizontal + cinematicSway) + 
                  shakeX;
        const z = this.mina.position.z + 
                  cameraDistance * Math.cos(this.cameraRotation.horizontal + cinematicSway) + 
                  shakeZ;
        const y = this.mina.position.y + 
                  cameraHeight + 
                  Math.sin(this.cameraRotation.vertical) * 4;
        
        // Smoothly move camera to target position with different speeds for drama
        const targetPosition = new THREE.Vector3(x, y, z);
        const lerpSpeed = this.gameState.monstersNearby > 0 ? 0.15 : 0.08; // Faster when in danger
        this.camera.position.lerp(targetPosition, lerpSpeed);
        
        // Enhanced look-at with slight offset for more dynamic framing
        const lookAtTarget = this.mina.position.clone();
        
        // Add slight vertical offset when jumping
        if (this.mina.userData?.animations?.currentState === 'jumping') {
            lookAtTarget.y += 1;
        }
        
        // Add forward prediction when moving fast
        if (isMoving && this.controls.run) {
            const moveDirection = new THREE.Vector3();
            if (this.controls.forward) moveDirection.z -= 2;
            if (this.controls.backward) moveDirection.z += 2;
            if (this.controls.left) moveDirection.x -= 2;
            if (this.controls.right) moveDirection.x += 2;
            lookAtTarget.add(moveDirection);
        }
        
        this.camera.lookAt(lookAtTarget);
        
        // Adjust field of view dynamically for cinematic effect
        const targetFOV = this.gameState.monstersNearby > 0 ? 85 : 75; // Wider when in danger
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 0.02);
        this.camera.updateProjectionMatrix();
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
        const currentTime = this.clock.getElapsedTime();
        
        this.monsters.forEach((monster, index) => {
            const distanceToMina = monster.position.distanceTo(this.mina.position);
            const distanceToSacha = monster.position.distanceTo(this.sacha.position);
            const minDistance = Math.min(distanceToMina, distanceToSacha);
            
            // Enhanced AI states: idle, patrolling, alerted, chasing, searching
            if (!monster.userData.aiState) monster.userData.aiState = 'patrolling';
            if (!monster.userData.lastSeenTarget) monster.userData.lastSeenTarget = null;
            if (!monster.userData.searchTime) monster.userData.searchTime = 0;
            if (!monster.userData.alertLevel) monster.userData.alertLevel = 0;
            
            // Determine target (closer of Mina or Sacha)
            const target = distanceToMina < distanceToSacha ? this.mina : this.sacha;
            const targetDistance = minDistance;
            
            // Update AI state based on distance and line of sight
            if (targetDistance < monster.userData.detectionRadius) {
                this.gameState.monstersNearby++;
                
                // Check for obstacles (simple line of sight)
                const hasLineOfSight = this.checkLineOfSight(monster.position, target.position);
                
                if (hasLineOfSight && targetDistance < monster.userData.detectionRadius * 0.8) {
                    monster.userData.aiState = 'chasing';
                    monster.userData.lastSeenTarget = target.position.clone();
                    monster.userData.alertLevel = Math.min(monster.userData.alertLevel + deltaTime, 3);
                } else if (monster.userData.aiState !== 'chasing') {
                    monster.userData.aiState = 'alerted';
                    monster.userData.alertLevel = Math.min(monster.userData.alertLevel + deltaTime * 0.5, 2);
                }
            } else if (monster.userData.aiState === 'chasing' && monster.userData.lastSeenTarget) {
                // Lost sight, enter search mode
                monster.userData.aiState = 'searching';
                monster.userData.searchTime = 5; // Search for 5 seconds
            }
            
            // Execute AI behavior based on state
            switch (monster.userData.aiState) {
                case 'chasing':
                    this.monsterChase(monster, target, deltaTime);
                    break;
                case 'searching':
                    this.monsterSearch(monster, deltaTime);
                    break;
                case 'alerted':
                    this.monsterAlerted(monster, target, deltaTime);
                    break;
                case 'patrolling':
                default:
                    this.monsterPatrol(monster, deltaTime);
                    break;
            }
            
            // Group coordination - monsters communicate
            if (monster.userData.aiState === 'chasing' || monster.userData.aiState === 'alerted') {
                this.alertNearbyMonsters(monster, index, target.position);
            }
            
            // Check if monster caught player
            if (targetDistance < 2) {
                this.gameState.health -= (10 + monster.userData.alertLevel * 5) * deltaTime;
                if (this.gameState.health <= 0) {
                    this.gameOver();
                }
            }
            
            // Enhanced monster animations based on state
            this.animateMonster(monster, currentTime, deltaTime);
            
            // Gradually reduce alert level when not actively chasing
            if (monster.userData.aiState !== 'chasing' && monster.userData.aiState !== 'alerted') {
                monster.userData.alertLevel = Math.max(monster.userData.alertLevel - deltaTime * 0.3, 0);
            }
        });
    }
    
    monsterChase(monster, target, deltaTime) {
        // Aggressive chase with predictive movement
        const futureTargetPos = target.position.clone();
        if (target.userData && target.userData.velocity) {
            futureTargetPos.add(target.userData.velocity.clone().multiplyScalar(0.3));
        }
        
        const direction = new THREE.Vector3()
            .subVectors(futureTargetPos, monster.position)
            .normalize();
        
        const chaseSpeed = monster.userData.speed * (1 + monster.userData.alertLevel * 0.3);
        monster.position.add(direction.multiplyScalar(chaseSpeed * deltaTime));
        monster.lookAt(futureTargetPos);
        
        monster.userData.lastSeenTarget = target.position.clone();
    }
    
    monsterSearch(monster, deltaTime) {
        monster.userData.searchTime -= deltaTime;
        
        if (monster.userData.searchTime > 0 && monster.userData.lastSeenTarget) {
            // Move towards last known position
            const direction = new THREE.Vector3()
                .subVectors(monster.userData.lastSeenTarget, monster.position);
            
            if (direction.length() > 2) {
                direction.normalize();
                monster.position.add(direction.multiplyScalar(monster.userData.speed * 0.7 * deltaTime));
            } else {
                // Reached last known position, search in circles
                const searchRadius = 5;
                const angle = this.clock.getElapsedTime() * 2 + monster.userData.id;
                const searchTarget = monster.userData.lastSeenTarget.clone();
                searchTarget.x += Math.cos(angle) * searchRadius;
                searchTarget.z += Math.sin(angle) * searchRadius;
                
                const searchDirection = new THREE.Vector3()
                    .subVectors(searchTarget, monster.position)
                    .normalize();
                monster.position.add(searchDirection.multiplyScalar(monster.userData.speed * 0.5 * deltaTime));
            }
        } else {
            // Give up search, return to patrolling
            monster.userData.aiState = 'patrolling';
            monster.userData.lastSeenTarget = null;
        }
    }
    
    monsterAlerted(monster, target, deltaTime) {
        // Move cautiously towards target area
        const direction = new THREE.Vector3()
            .subVectors(target.position, monster.position)
            .normalize();
        
        monster.position.add(direction.multiplyScalar(monster.userData.speed * 0.6 * deltaTime));
        monster.lookAt(target.position);
    }
    
    monsterPatrol(monster, deltaTime) {
        // Enhanced patrolling with waypoints
        if (!monster.userData.patrolWaypoints) {
            // Create patrol waypoints around spawn area
            const spawnPos = monster.userData.spawnPosition || monster.position.clone();
            monster.userData.patrolWaypoints = [];
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const waypoint = spawnPos.clone();
                waypoint.x += Math.cos(angle) * 15;
                waypoint.z += Math.sin(angle) * 15;
                monster.userData.patrolWaypoints.push(waypoint);
            }
            monster.userData.currentWaypoint = 0;
        }
        
        const currentWaypoint = monster.userData.patrolWaypoints[monster.userData.currentWaypoint];
        const direction = new THREE.Vector3()
            .subVectors(currentWaypoint, monster.position);
        
        if (direction.length() < 3) {
            // Reached waypoint, move to next
            monster.userData.currentWaypoint = (monster.userData.currentWaypoint + 1) % monster.userData.patrolWaypoints.length;
        } else {
            direction.normalize();
            monster.position.add(direction.multiplyScalar(monster.userData.speed * 0.4 * deltaTime));
        }
    }
    
    alertNearbyMonsters(alertingMonster, alertingIndex, targetPosition) {
        const alertRadius = 25;
        
        this.monsters.forEach((monster, index) => {
            if (index !== alertingIndex) {
                const distance = alertingMonster.position.distanceTo(monster.position);
                if (distance < alertRadius && monster.userData.aiState === 'patrolling') {
                    monster.userData.aiState = 'alerted';
                    monster.userData.lastSeenTarget = targetPosition.clone();
                    monster.userData.alertLevel = 1;
                }
            }
        });
    }
    
    checkLineOfSight(from, to) {
        // Simple line of sight check (can be enhanced with raycasting)
        const distance = from.distanceTo(to);
        const maxRange = 30;
        return distance < maxRange; // Simplified for now
    }
    
    animateMonster(monster, currentTime, deltaTime) {
        const baseAnimation = Math.sin(currentTime + monster.userData.id) * 0.01;
        
        switch (monster.userData.aiState) {
            case 'chasing':
                // Aggressive movement
                monster.rotation.y += baseAnimation * 3;
                monster.scale.setScalar(1 + Math.sin(currentTime * 8) * 0.05);
                break;
            case 'alerted':
                // Tense, looking around
                monster.rotation.y += baseAnimation * 2;
                monster.position.y = monster.userData.originalY + Math.sin(currentTime * 4) * 0.1;
                break;
            case 'searching':
                // Quick head movements
                monster.rotation.y += Math.sin(currentTime * 6) * 0.1;
                break;
            default:
                // Calm patrolling
                monster.rotation.y += baseAnimation;
                monster.position.y = monster.userData.originalY + Math.sin(currentTime * 2) * 0.02;
                break;
        }
    }
    
    checkTreasureCollection() {
        this.treasures.forEach(treasure => {
            if (!treasure.userData.collected) {
                const distance = this.mina.position.distanceTo(treasure.position);
                if (distance < 3) {
                    treasure.userData.collected = true;
                    treasure.visible = false;
                    this.gameState.treasuresFound++;
                    
                    // Celebration animations!
                    this.playCharacterAnimation(this.mina, 'jumping', 2000);
                    this.playCharacterAnimation(this.sacha, 'waving', 1500);
                    
                    // Add a dancing celebration after the initial reaction
                    setTimeout(() => {
                        this.playCharacterAnimation(this.mina, 'dancing', 2500);
                        this.playCharacterAnimation(this.sacha, 'dancing', 2500);
                    }, 2200);
                    
                    console.log(`Treasure collected! ${this.gameState.treasuresFound}/${this.gameState.totalTreasures}`);
                    
                    if (this.gameState.treasuresFound >= this.gameState.totalTreasures) {
                        // Epic final celebration sequence!
                        this.playCharacterAnimation(this.mina, 'laughing', 2000);
                        this.playCharacterAnimation(this.sacha, 'jumping', 2000);
                        
                        setTimeout(() => {
                            this.playCharacterAnimation(this.mina, 'dancing', 4000);
                            this.playCharacterAnimation(this.sacha, 'dancing', 4000);
                        }, 2500);
                        
                        setTimeout(() => {
                            this.playCharacterAnimation(this.mina, 'waving', 3000);
                            this.playCharacterAnimation(this.sacha, 'waving', 3000);
                        }, 7000);
                        
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
            
            // Update character animations
            this.updateCharacterAnimations(this.mina, deltaTime);
            this.updateCharacterAnimations(this.sacha, deltaTime);
            
            // Check for monster reactions
            this.checkMonsterReactions();
            
            // Update dynamic world systems
            this.updateInteractiveNPCs(deltaTime);
            this.updateCrowds(deltaTime);
            this.updateRides(deltaTime);
            this.updateBuildingInteriors(deltaTime);
            this.updateRideVehicles(deltaTime);
            this.updateWorldEvents(deltaTime);
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