import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader()
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

/**
 * Base
 */
// Debug
const gui = new dat.GUI()
const debugObject = {}

const base_url = import.meta.env.BASE_URL

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Update all materials
 */
const updateAllMaterials = () =>
{
    scene.traverse((child) =>
    {
        if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial)
        {
            child.material.envMapIntensity = debugObject.envMapIntensity
            child.material.needsUpdate = true
            child.castShadow = true
            child.receiveShadow = true
        }
    })
}

/**
 * Environment map
 */
const environmentMap = cubeTextureLoader.load([
    `${base_url}textures/environmentMap/px.jpg`,
    `${base_url}textures/environmentMap/nx.jpg`,
    `${base_url}textures/environmentMap/py.jpg`,
    `${base_url}textures/environmentMap/ny.jpg`,
    `${base_url}textures/environmentMap/pz.jpg`,
    `${base_url}textures/environmentMap/nz.jpg`
])

environmentMap.encoding = THREE.sRGBEncoding
scene.environment = environmentMap

debugObject.envMapIntensity = 0.4
gui.add(debugObject, 'envMapIntensity').min(0).max(4).step(0.001).onChange(updateAllMaterials)

/**
 * Models
 */
let foxMixer = null

// Animation
let fox_actions = {}
let fox_current_action = null

gltfLoader.load(
    `${base_url}models/Fox/glTF/Fox.gltf`,
    (gltf) =>
    {
        gltf.scene.scale.set(0.02, 0.02, 0.02)
        scene.add(gltf.scene)

        foxMixer = new THREE.AnimationMixer(gltf.scene)

        fox_actions.idle = foxMixer.clipAction(gltf.animations[0])
        fox_actions.walking = foxMixer.clipAction(gltf.animations[1])
        fox_actions.running = foxMixer.clipAction(gltf.animations[2])

        fox_current_action = fox_actions.idle
        fox_current_action.play()

        const animation_play = (name) =>
        {
            const new_action = fox_actions[name]
            const old_action = fox_current_action

            if(new_action !== old_action)
            {
                new_action.reset()
                new_action.play()
                new_action.crossFadeFrom(old_action, 1)
                fox_current_action = new_action
            }
        }

        debugObject.play_idle = () => { animation_play('idle') }
        debugObject.play_walking = () => { animation_play('walking') }
        debugObject.play_running = () => { animation_play('running') }

        const fox_debug_folder = gui.addFolder('fox')
        fox_debug_folder.add(debugObject, 'play_idle')
        fox_debug_folder.add(debugObject, 'play_walking')
        fox_debug_folder.add(debugObject, 'play_running')

        updateAllMaterials()
    }
)

/**
 * Floor
 */
const floorColorTexture = textureLoader.load(`${base_url}textures/dirt/color.jpg`)
floorColorTexture.encoding = THREE.sRGBEncoding
floorColorTexture.repeat.set(1.5, 1.5)
floorColorTexture.wrapS = THREE.RepeatWrapping
floorColorTexture.wrapT = THREE.RepeatWrapping

const floorNormalTexture = textureLoader.load(`${base_url}textures/dirt/normal.jpg`)
floorNormalTexture.repeat.set(1.5, 1.5)
floorNormalTexture.wrapS = THREE.RepeatWrapping
floorNormalTexture.wrapT = THREE.RepeatWrapping

const floorGeometry = new THREE.CircleGeometry(5, 64)
const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorColorTexture,
    normalMap: floorNormalTexture
})
const floor = new THREE.Mesh(floorGeometry, floorMaterial)
floor.rotation.x = - Math.PI * 0.5
floor.receiveShadow = true
scene.add(floor)

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 4)
directionalLight.castShadow = true
directionalLight.shadow.camera.far = 15
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.normalBias = 0.05
directionalLight.position.set(3.5, 2, - 1.25)
scene.add(directionalLight)

gui.add(directionalLight, 'intensity').min(0).max(10).step(0.001).name('lightIntensity')
gui.add(directionalLight.position, 'x').min(- 5).max(5).step(0.001).name('lightX')
gui.add(directionalLight.position, 'y').min(- 5).max(5).step(0.001).name('lightY')
gui.add(directionalLight.position, 'z').min(- 5).max(5).step(0.001).name('lightZ')

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100)
camera.position.set(6, 4, 8)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.CineonToneMapping
renderer.toneMappingExposure = 1.75
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setClearColor('#211d20')
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    controls.update()

    if(foxMixer)
    {
        foxMixer.update(deltaTime)
    }

    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()
