import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

//Variables globales
var escena, camara, renderer, controlador_camara, textura_cargada;
var cubitos = [];
var isRotating = false;
var rubiksCube = null;
var raycaster, mouse;
var isDragging = false;
var dragStartCube = null;
var dragStartPoint = new THREE.Vector2();
var dragStartFaceNormal = new THREE.Vector3();
var dragStartIntersection = new THREE.Vector3();
var tamañoCubito = 3.25;

//Array para que los colores de las caras del cubo estén parametrizados
const colors = {
    white: 0xffffff,
    yellow: 0xffff00,
    red: 0xff0000,
    orange: 0xff8800,
    blue: 0x0000ff,
    green: 0x00ff00,
    black: 0x000000
};

crearEscena();
gameLoop();

function crearEscena() {
    //Crea la escena y el color de fondo
    escena = new THREE.Scene();
    escena.background = new THREE.Color(0.1, 0.1, 0.15);

    //Crea la cámara. Define la posición en los ejes x,y,z y el punto al que apunta
    camara = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camara.position.set(15, 15, 15);
    camara.lookAt(0, 0, 0);

    //Crea el renderer y lo añade al dom
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //Crea la iluminación ambiental y la añade a la escena
    let luzAmbiental = new THREE.AmbientLight(0x404040, 0.6);
    escena.add(luzAmbiental);

    //Crea la iluminación direccional y la añade a la escena
    let iluminacion = new THREE.DirectionalLight(0xffffff, 1);
    iluminacion.position.set(50, 50, 50);
    iluminacion.target.position.set(0, 0, 0);
    escena.add(iluminacion);
    escena.add(iluminacion.target);

    //Crea los cubitos y los añade a la escena
    crearCubitos(escena);

    //Crea el controlador de la cámara que permite girar la cámara alrededor del cubo en tres dimensiones y lo añade a la escena
    controlador_camara = new OrbitControls(camara, renderer.domElement);
    controlador_camara.target.set(0, 0, 0);

    //Crea el raycaster que permite detectar colisiones y lo añade a la escena
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    //Crea los event listeners para mouse, teclado y eventos táctiles
    document.addEventListener('keydown', onKeyDown);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    //Los eventos táctiles usan capture: true para ejecutarse antes que OrbitControls
    renderer.domElement.addEventListener('touchstart', onMouseDown, { capture: true, passive: false });
    renderer.domElement.addEventListener('touchend', onMouseUp, { capture: true, passive: false });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });

    //Crea el panel de instrucciones sobre como girar el cubo
    createControlPanel();
}

function crearCubitos(escena) {
    const separacionCubitos = 3.5;
    let cubito, centro;

    rubiksCube = new THREE.Group();
    //Utiliza tres bucles for para crear los 27 (26 cubitos + la esfera) cubitos del cubo de rubik usando coordenadas x,y,z que van de -1 a 1
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                if (x == 0 && y == 0 && z == 0) { //En el centro del cubo de rubbik, he puesto una esfera negra como "núcleo".
                    let geometria_centro = new THREE.SphereGeometry(1.625, 32, 32);
                    centro = new THREE.Mesh(geometria_centro, new THREE.MeshBasicMaterial({ color: colors.black }));
                    centro.userData = { x: x, y: y, z: z, isCenter: true };
                    rubiksCube.add(centro);
                } else {
                    let geometria_cubito = new THREE.BoxGeometry(tamañoCubito, tamañoCubito, tamañoCubito);
                    cubito = new THREE.Mesh(geometria_cubito, pintaCaras(x, y, z));
                    cubito.position.set(x * separacionCubitos, y * separacionCubitos, z * separacionCubitos);
                    cubito.userData = { x: x, y: y, z: z, isCenter: false };

                    //Si el cubito es un cubito del centro de una cara, se llama al método que añade como textura el logo Miguel, inspirado en el logo del cubo de Rubik original.
                    if ((x + y + z == 1 || x + y + z == -1) && (x == 0 || y == 0 || z == 0)) {
                        addTextureToCenterCube(cubito, x, y, z);
                    }
                    rubiksCube.add(cubito);
                    cubitos.push(cubito);
                }
            }
        }
    }

    escena.add(rubiksCube);
}

//Función que pinta las caras de los cubitos según su posición en el cubo de rubik
function pintaCaras(x, y, z) {
    let materials = [
        new THREE.MeshBasicMaterial({ color: colors.black }),
        new THREE.MeshBasicMaterial({ color: colors.black }),
        new THREE.MeshBasicMaterial({ color: colors.black }),
        new THREE.MeshBasicMaterial({ color: colors.black }),
        new THREE.MeshBasicMaterial({ color: colors.black }),
        new THREE.MeshBasicMaterial({ color: colors.black })
    ];

    if (x == 1) materials[0] = new THREE.MeshBasicMaterial({ color: colors.red });
    else if (x == -1) materials[1] = new THREE.MeshBasicMaterial({ color: colors.orange });

    if (y == 1) materials[2] = new THREE.MeshBasicMaterial({ color: colors.yellow });
    else if (y == -1) materials[3] = new THREE.MeshBasicMaterial({ color: colors.white });

    if (z == 1) materials[4] = new THREE.MeshBasicMaterial({ color: colors.green });
    else if (z == -1) materials[5] = new THREE.MeshBasicMaterial({ color: colors.blue });

    return materials;
}


function addTextureToCenterCube(cube, x, y, z) {
    const textureLoader = new THREE.TextureLoader();
    let logo = './assets/logo_black.png';
    let faceIndex = -1;

    //Comprueba que cara es para añadir el logo del color correspondiente como material.
    if (x === 1) {
        logo = './assets/logo_red.png';
        faceIndex = 0;
    } else if (x === -1) {
        logo = './assets/logo_orange.png';
        faceIndex = 1;
    } else if (y === 1) {
        logo = './assets/logo_yellow.png';
        faceIndex = 2;
    } else if (y === -1) {
        logo = './assets/logo_white.png';
        faceIndex = 3;
    } else if (z === 1) {
        logo = './assets/logo_green.png';
        faceIndex = 4;
    } else if (z === -1) {
        logo = './assets/logo_blue.png';
        faceIndex = 5;
    };

    textureLoader.load(
        logo,
        (texture) => {
            if (faceIndex !== -1) {
                const newMaterials = [...cube.material];
                newMaterials[faceIndex] = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true
                });
                cube.material = newMaterials;
            }
            textura_cargada = true;
        },
        undefined,
        (error) => {
            console.error('Error loading texture:', error);
        }
    );
}

//Función auxiliar para obtener coordenadas de eventos de ratón o táctiles
function getEventCoordinates(event) {
    if (event.touches && event.touches.length > 0) {
        return {
            clientX: event.touches[0].clientX,
            clientY: event.touches[0].clientY
        };
    }
    return {
        clientX: event.clientX,
        clientY: event.clientY
    };
}

//Previene el scroll y otros comportamientos táctiles cuando se hace drag táctil
function onTouchMove(event) {
    if (isDragging) {
        event.preventDefault();
        event.stopPropagation();
    }
}

function onMouseDown(event) {
    if (isRotating) return;  //Evita iniciar otro giro mientras ya se está girando una capa

    //Si es un evento táctil con más de un toque, permite que OrbitControls lo maneje
    if (event.touches && event.touches.length > 1) {
        return;
    }

    //Calcula la posición del ratón en coordenadas normalizadas del dispositivo.
    //Navegador (píxeles) vs Three.js (NDC):
    //Navegador: (0,0) está arriba a la izquierda, Y crece hacia abajo
    //Three.js: (-1,1) está arriba a la izquierda, (1,-1) abajo a la derecha, (0,0) en el centro
    const coords = getEventCoordinates(event);
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;

    //Actualiza el raycaster (Prepara un rayo láser invisible desde la cámara hacia donde está el ratón en la escena 3D)
    raycaster.setFromCamera(mouse, camara);

    //Comprueba intersecciones con los cubitos (Dispara el rayo láser)
    const intersects = raycaster.intersectObjects(cubitos);

    //Guarda el primer elemento, en este caso un cubito, con el que intersecta el rayo
    if (intersects.length > 0) {
        //Previene el comportamiento por defecto y detiene la propagación para que OrbitControls no capture el evento
        event.preventDefault();
        event.stopPropagation();

        const intersection = intersects[0];
        dragStartCube = intersection.object;
        dragStartPoint.set(mouse.x, mouse.y);


        //Almacena la normal de la cara, esto indica qué cara se pulsó
        dragStartFaceNormal.copy(intersection.face.normal);
        //Transforma la normal al espacio mundial (porque la cámara puede haber rotado y las coordenadas locales pueden ser diferentes de las globales)
        dragStartFaceNormal.transformDirection(dragStartCube.matrixWorld);
        dragStartFaceNormal.normalize(); //Normaliza, es decir, lo convierte en un vector unitario

        //Almacena el punto de intersección
        dragStartIntersection.copy(intersection.point);

        isDragging = true;

        //Desactiva los controles de órbita mientras arrastras
        controlador_camara.enabled = false;
    }
}

function onMouseUp(event) {
    if (!isDragging || !dragStartCube) {
        controlador_camara.enabled = true;
        return;
    }

    //Previene comportamiento por defecto en eventos táctiles
    event.preventDefault();
    event.stopPropagation();

    //Calcula la posición final del ratón cuando se suelta (después de un drag por ejemplo) en coordenadas normalizadas del dispositivo.
    const coords = getEventCoordinates(event);
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((coords.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((coords.clientY - rect.top) / rect.height) * 2 + 1;

    //Calcula el vector de arrastre (delta)
    const dragDelta = new THREE.Vector2(
        mouse.x - dragStartPoint.x,
        mouse.y - dragStartPoint.y
    );

    //Calcula la distancia del arrastre usando el teorema de Pitágoras
    const dragDistance = dragDelta.length();

    //Procesa solo si el arrastre fue significativo (umbral para evitar arrastres accidentales)
    if (dragDistance > 0.05) {
        processDrag(dragStartCube, dragDelta, dragStartFaceNormal, dragStartIntersection);
    }

    isDragging = false;
    dragStartCube = null;
    controlador_camara.enabled = true;
}

function processDrag(cube, dragDelta, faceNormal, intersectionPoint) {
    const cubePos = cube.userData;

    //Determina con qué eje está alineada la normal de la cara
    const absX = Math.abs(faceNormal.x);
    const absY = Math.abs(faceNormal.y);
    const absZ = Math.abs(faceNormal.z);

    let axis, layer;

    if (absX > absY && absX > absZ) {

        if (Math.abs(dragDelta.y) > Math.abs(dragDelta.x)) {
            //Arrastre vertical -> rotar alrededor de Z
            axis = 'z';
            layer = cubePos.z;
        } else {
            //Arrastre horizontal -> rotar alrededor de Y
            axis = 'y';
            layer = cubePos.y;
        }
    } else if (absY > absX && absY > absZ) {
        if (Math.abs(dragDelta.y) > Math.abs(dragDelta.x)) {
            //Arrastre vertical -> rotar alrededor de X
            axis = 'x';
            layer = cubePos.x;
        } else {
            //Arrastre horizontal -> rotar alrededor de Z
            axis = 'z';
            layer = cubePos.z;
        }
    } else {
        if (Math.abs(dragDelta.y) > Math.abs(dragDelta.x)) {
            //Arrastre vertical -> rotar alrededor de X
            axis = 'x';
            layer = cubePos.x;
        } else {
            //Arrastre horizontal -> rotar alrededor de Y
            axis = 'y';
            layer = cubePos.y;
        }
    }

    //Determina la dirección de rotación usando matemática 3D
    //Obtiene los vectores "right" y "up" de la cámara en espacio mundial
    const cameraRight = new THREE.Vector3();
    const cameraUp = new THREE.Vector3();

    camara.getWorldDirection(new THREE.Vector3()); //Actualiza matrices de la cámara
    cameraRight.setFromMatrixColumn(camara.matrixWorld, 0); //Vector right de la cámara
    cameraUp.setFromMatrixColumn(camara.matrixWorld, 1); //Vector up de la cámara

    //Convierte el delta 2D del arrastre a una dirección 3D en espacio mundial
    const dragDirection3D = new THREE.Vector3();
    dragDirection3D.addScaledVector(cameraRight, dragDelta.x);
    dragDirection3D.addScaledVector(cameraUp, dragDelta.y);
    dragDirection3D.normalize();

    //Define el vector del eje de rotación
    const rotationAxisVector = new THREE.Vector3();
    if (axis === 'x') rotationAxisVector.set(1, 0, 0);
    if (axis === 'y') rotationAxisVector.set(0, 1, 0);
    if (axis === 'z') rotationAxisVector.set(0, 0, 1);

    //Proyecta la dirección de arrastre sobre el plano perpendicular al eje de rotación
    const dragProjected = dragDirection3D.clone();
    const dotProduct = dragDirection3D.dot(rotationAxisVector);
    dragProjected.addScaledVector(rotationAxisVector, -dotProduct);
    dragProjected.normalize();

    //Crea un vector de referencia en el plano de rotación
    //Usa la normal de la cara proyectada sobre el mismo plano
    const referenceVector = faceNormal.clone();
    const faceAxisDot = faceNormal.dot(rotationAxisVector);
    referenceVector.addScaledVector(rotationAxisVector, -faceAxisDot);
    referenceVector.normalize();

    //Usa el producto cruz para determinar la dirección de rotación
    //cross(reference, dragProjected) da la orientación
    const cross = new THREE.Vector3();
    cross.crossVectors(referenceVector, dragProjected);

    //El signo del producto punto con el eje de rotación indica la dirección
    const rotationSign = cross.dot(rotationAxisVector);
    const clockwise = rotationSign < 0;

    //console.log(`Drag detected: axis=${axis}, layer=${layer}, clockwise=${clockwise}`);
    //console.log(`Face normal: (${faceNormal.x.toFixed(2)}, ${faceNormal.y.toFixed(2)}, ${faceNormal.z.toFixed(2)})`);
    //console.log(`Drag direction: (${dragDelta.x.toFixed(2)}, ${dragDelta.y.toFixed(2)})`);

    rotateLayer(axis, layer, clockwise);
}

//Función que obtiene los cubitos de una capa determinada según el eje y el valor de la capa
function getCubitosLayer(axis, value) {
    return cubitos.filter(cubito => {
        if (axis === 'x') return cubito.userData.x === value;
        if (axis === 'y') return cubito.userData.y === value;
        if (axis === 'z') return cubito.userData.z === value;
    });
}

//Ordena los cubitos de una capa en orden circular según el eje de rotación. Esto es crucial para asegurar que los cubitos se roten correctamente alrededor del eje.
function ordenarLayerCircular(layerCubitos, axis) {
    return layerCubitos.sort((a, b) => {
        let angA, angB;

        if (axis === 'x') {
            angA = Math.atan2(a.userData.z, a.userData.y);
            angB = Math.atan2(b.userData.z, b.userData.y);
        } else if (axis === 'y') {
            angA = Math.atan2(a.userData.x, a.userData.z);
            angB = Math.atan2(b.userData.x, b.userData.z);
        } else if (axis === 'z') {
            angA = Math.atan2(a.userData.y, a.userData.x);
            angB = Math.atan2(b.userData.y, b.userData.x);
        }

        return angA - angB;
    });
}

//Rota una capa del cubo de Rubik alrededor de un eje dado (x, y, z) y en una sentido (horario o antihorario)
function rotateLayer(axis, layer, clockwise = true) { //Si no se pasa el tercer parámetro, se considera que se rota en sentido horario (clockwise será true)
    if (isRotating) return; //Si ya está rotando, no se hace nada
    isRotating = true; //Se marca como rotando

    const layerCubitos = getCubitosLayer(axis, layer); //Obtiene los cubitos de la capa

    const bordesCubitos = layerCubitos.filter(c => { //Obtiene todos los cubitos de la capa menos el cubito central , que no rota
        if (axis === 'x') return !(c.userData.y === 0 && c.userData.z === 0);
        if (axis === 'y') return !(c.userData.x === 0 && c.userData.z === 0);
        if (axis === 'z') return !(c.userData.x === 0 && c.userData.y === 0);
    });

    const ordenados = ordenarLayerCircular(bordesCubitos, axis); //Ordena los cubitos de la capa en orden circular

    //console.log(`\n=== Rotando ${axis} layer ${layer} (${clockwise ? 'horario' : 'antihorario'}) ===`);
    //ordenados.forEach((c, i) => {
    //    console.log(`[${i}]: (${c.userData.x}, ${c.userData.y}, ${c.userData.z})`);
    //});

    const posicionesOriginales = ordenados.map(c => ({ //Guarda las posiciones originales de los cubitos
        x: c.userData.x,
        y: c.userData.y,
        z: c.userData.z
    }));

    const rotationGroup = new THREE.Group(); //Crea un grupo para rotar los cubitos
    escena.add(rotationGroup); //Añade el grupo a la escena

    layerCubitos.forEach(cube => { //Añade los cubitos al grupo
        rubiksCube.remove(cube);
        rotationGroup.add(cube);
    });

    //Variables para la animación
    const duration = 500; //Duración de la animación
    const startTime = Date.now(); //Tiempo de inicio de la animación
    const angleDirection = clockwise ? -1 : 1; //Sentido de rotación
    const endAngle = angleDirection * Math.PI / 2; //Ángulo final de rotación

    function animateRotation() { //Función de animación que se llama a sí misma de manera recursiva hasta que se completa la animación (mientras dure el tiempo definido en duration)
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentAngle = endAngle * easeProgress;

        if (axis === 'x') rotationGroup.rotation.x = currentAngle;
        if (axis === 'y') rotationGroup.rotation.y = currentAngle;
        if (axis === 'z') rotationGroup.rotation.z = currentAngle;

        if (progress < 1) { //Si la animación no ha terminado, se llama a sí misma de manera recursiva
            requestAnimationFrame(animateRotation);
        } else { //Si la animación ha terminado, se restauran las posiciones originales de los cubitos
            const rotationAxis = new THREE.Vector3();
            if (axis === 'x') rotationAxis.set(1, 0, 0);
            if (axis === 'y') rotationAxis.set(0, 1, 0);
            if (axis === 'z') rotationAxis.set(0, 0, 1);

            //Se rota cada cubito del grupo de rotación permanentemente. Se utiliza premultiply para acumular la rotación en lugar de reemplazarla
            const rotationQuaternion = new THREE.Quaternion();
            rotationQuaternion.setFromAxisAngle(rotationAxis, endAngle);

            layerCubitos.forEach(cube => {
                cube.quaternion.premultiply(rotationQuaternion);
            });

            trasponerCubitos(ordenados, posicionesOriginales, clockwise);

            layerCubitos.forEach(cube => { //Se borran los cubitos del grupo de rotación y se añaden de vuelta al grupo del cubo de Rubik
                rotationGroup.remove(cube);
                rubiksCube.add(cube);
            });

            escena.remove(rotationGroup);
            isRotating = false;
        }
    }

    animateRotation();
}

function trasponerCubitos(ordenados, posicionesOriginales, clockwise) {
    const n = ordenados.length;
    const separacion = 3.5;

    for (let i = 0; i < n; i++) {
        const indiceAnterior = clockwise ? (i - 2 + n) % n : (i + 2) % n; //Se calcula el índice del cubito anterior en la capa según el sentido de rotación
        const nuevaPos = posicionesOriginales[indiceAnterior]; //Se obtiene la posición original del cubito anterior

        //Se actualizan las coordenadas del cubito
        ordenados[i].userData.x = nuevaPos.x;
        ordenados[i].userData.y = nuevaPos.y;
        ordenados[i].userData.z = nuevaPos.z;

        //Se actualiza la posición del cubito
        ordenados[i].position.set(
            nuevaPos.x * separacion,
            nuevaPos.y * separacion,
            nuevaPos.z * separacion
        );
    }
}

//Función que captura los eventos de teclado y llama a la función de rotar capa según la tecla pulsada
function onKeyDown(event) {
    if (isRotating) return;

    const key = event.key.toLowerCase();
    const shift = event.shiftKey;

    if (key === 'u') rotateLayer('y', 1, !shift);
    if (key === 'd') rotateLayer('y', -1, !shift);
    if (key === 'l') rotateLayer('x', -1, !shift);
    if (key === 'r') rotateLayer('x', 1, !shift);
    if (key === 'f') rotateLayer('z', 1, !shift);
    if (key === 'b') rotateLayer('z', -1, !shift);
}

//Actualiza la cámara y renderiza la escena en cada frame
function gameLoop() {
    controlador_camara.update();
    renderer.render(escena, camara);
    requestAnimationFrame(gameLoop);
}

function createControlPanel() {
    const isMobile = window.innerWidth <= 768;

    const controlPanel = document.createElement('div');
    controlPanel.id = 'controlPanel';
    controlPanel.style.cssText = `
        position: fixed;
        top: ${isMobile ? 'auto' : '20px'};
        bottom: ${isMobile ? '20px' : 'auto'};
        left: 20px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: ${isMobile ? '15px' : '20px'};
        border-radius: 12px;
        font-family: 'Arial', sans-serif;
        font-size: ${isMobile ? '12px' : '14px'};
        line-height: 1.6;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 1000;
        min-width: ${isMobile ? '200px' : '280px'};
        max-width: ${isMobile ? 'calc(100vw - 40px)' : '320px'};
        user-select: none;
        transition: all 0.3s ease;
    `;

    //Botón de colapsar/expandir
    const toggleButton = document.createElement('div');
    toggleButton.style.cssText = `
        display: ${isMobile ? 'flex' : 'none'};
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        padding: 5px 0;
        margin-bottom: 10px;
        border-bottom: 2px solid #4ade80;
    `;

    const toggleTitle = document.createElement('span');
    toggleTitle.textContent = '📱 Controles';
    toggleTitle.style.cssText = `
        color: #4ade80;
        font-weight: bold;
        font-size: 14px;
    `;

    const toggleIcon = document.createElement('span');
    toggleIcon.textContent = '▼';
    toggleIcon.style.cssText = `
        color: #4ade80;
        font-size: 12px;
        transition: transform 0.3s ease;
    `;

    toggleButton.appendChild(toggleTitle);
    toggleButton.appendChild(toggleIcon);

    const title = document.createElement('h3');
    title.innerHTML = `<img src="assets/favicon_Cubo_Rubik.png" alt="Rubik" style="width:${isMobile ? '48px' : '64px'};height:${isMobile ? '48px' : '64px'};margin-right:10px;vertical-align:middle;border-radius:3px;"> Controles del Cubo de Rubik`;
    title.style.cssText = `
        display: ${isMobile ? 'none' : 'block'};
        margin: 0 0 15px 0;
        color: #4ade80;
        font-size: 18px;
        text-align: center;
        border-bottom: 2px solid #4ade80;
        padding-bottom: 10px;
    `;

    const controlsContent = document.createElement('div');
    controlsContent.id = 'controlsContent';
    controlsContent.innerHTML = `
        <div style="margin-bottom: 15px;">
            <div style="margin-left: 10px; margin-top: 8px;">
                <div><span style="color: #a78bfa;">${isMobile ? 'Tocar y Arrastrar' : 'Clic y Arrastrar'}</span> - Rotar capa</div>
                <div><span style="color: #a78bfa;">${isMobile ? 'Dos dedos y Arrastrar' : 'Clic Derecho y Arrastrar'}</span> - Orbitar cámara</div>
                <div><span style="color: #a78bfa;">${isMobile ? 'Pellizcar' : 'Rueda del ratón'}</span> - Acercar/Alejar</div>
            </div>
        </div>
        
        <div style="margin-bottom: 15px; display: ${isMobile ? 'none' : 'block'};">
            <strong style="color: #60a5fa;">⌨️ Controles del Teclado:</strong>
            <div style="margin-left: 10px; margin-top: 8px;">
                <div><span style="color: #ff6b6b;">U/D/L/R/F/B</span> - Rotar capas</div>
                <div><span style="color: #ffb347;">Shift + Tecla</span> - Sentido antihorario</div>
            </div>
        </div>
    `;

    //Estado inicial en móvil: colapsado
    if (isMobile) {
        controlsContent.style.display = 'none';
        toggleIcon.style.transform = 'rotate(-90deg)';
    }

    //Evento para colapsar/expandir
    toggleButton.addEventListener('click', function () {
        const isCollapsed = controlsContent.style.display === 'none';
        controlsContent.style.display = isCollapsed ? 'block' : 'none';
        toggleIcon.style.transform = isCollapsed ? 'rotate(0deg)' : 'rotate(-90deg)';
    });

    if (isMobile) {
        controlPanel.appendChild(toggleButton);
    } else {
        controlPanel.appendChild(title);
    }
    controlPanel.appendChild(controlsContent);
    document.body.appendChild(controlPanel);

    //Adaptar al cambiar el tamaño de la ventana
    window.addEventListener('resize', function () {
        const nowMobile = window.innerWidth <= 768;
        if (nowMobile !== isMobile) {
            document.body.removeChild(controlPanel);
            createControlPanel();
        }
    });
}
