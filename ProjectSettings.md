# Labyrinth Survival - Project Setup Guide

This guide will help you set up the Labyrinth Survival project in Unity.

## Prerequisites

- Unity 2022.3 LTS or newer
- Photon Fusion (available on the Unity Asset Store)
- Basic knowledge of Unity and C#

## Project Setup

1. Create a new 3D Unity project
2. Import the Photon Fusion package from the Asset Store
3. Set up the project structure as outlined in the README.md

## Required Packages

Install the following packages through the Package Manager:

- Photon Fusion
- TextMeshPro
- Cinemachine (optional, for advanced camera control)
- ProBuilder (for creating simple voxel-style meshes)
- Post Processing (optional, for visual effects)

## Project Settings

### Input System

The project uses Unity's legacy Input System. Make sure the following input axes are defined:

- Horizontal (for left/right movement)
- Vertical (for forward/backward movement)
- Jump (Space key)
- Fire1 (Left mouse button or E key for interaction)

### Physics Settings

Configure the physics settings as follows:

1. Open Edit > Project Settings > Physics
2. Set Gravity to (0, -20, 0) for faster falling
3. Create the following layers:
   - Player
   - Enemy
   - Interactable
   - Wall
   - Floor
4. Configure the collision matrix to prevent players from colliding with each other

### Photon Fusion Setup

1. Create a Photon account at https://dashboard.photonengine.com/
2. Create a new Fusion application in the dashboard
3. Copy your App ID
4. In Unity, open Window > Photon Fusion > Realtime Settings
5. Paste your App ID in the App Id Fusion field

## Scene Setup

### Main Menu Scene

1. Create a new scene called "MainMenu"
2. Add a Canvas with the UI elements defined in UIManager.cs
3. Add an empty GameObject with the SceneSetup.cs script
4. Configure the SceneSetup script with isMainMenu = true

### Game Scene

1. Create a new scene called "Game"
2. Add an empty GameObject with the SceneSetup.cs script
3. Configure the SceneSetup script with isMainMenu = false
4. Create the following prefabs and assign them to the SceneSetup script:
   - NetworkManager prefab with NetworkManager.cs
   - GameManager prefab with GameManager.cs
   - MazeGenerator prefab with MazeGenerator.cs
   - UIManager prefab with UIManager.cs

## Prefab Setup

### Player Prefab

1. Create a new empty GameObject
2. Add the following components:
   - NetworkObject
   - NetworkTransform
   - NetworkRigidbody
   - CharacterController
   - PlayerController.cs
3. Create a simple player model (cube or capsule) as a child
4. Add a ground check empty GameObject as a child
5. Configure the PlayerController script with the appropriate references

### Monster Prefab

1. Create a new empty GameObject
2. Add the following components:
   - NetworkObject
   - NetworkTransform
   - NavMeshAgent
   - MonsterAI.cs
3. Create a simple monster model as a child
4. Configure the MonsterAI script with the appropriate references

### Wall Prefab

1. Create a cube GameObject
2. Scale it to (1, 3, 1) for a standard wall
3. Add a Box Collider component
4. Add a material with a voxel-style texture

### Floor Prefab

1. Create a cube GameObject
2. Scale it to (1, 0.1, 1) for a thin floor
3. Add a Box Collider component
4. Add a material with a voxel-style texture

### Exit Prefab

1. Create a new empty GameObject
2. Add the following components:
   - NetworkObject
   - Box Collider (set as trigger)
   - ExitTrigger.cs
3. Add a visual indicator (e.g., particle effect or glowing object)
4. Configure the ExitTrigger script with the appropriate references

## Build Settings

1. Open File > Build Settings
2. Add the MainMenu and Game scenes to the build
3. Set the MainMenu scene as the first scene
4. Configure the platform settings as needed

## Testing

1. Enter Play mode in the Unity Editor to test the game
2. Use the Host button to start a new game session
3. Build and run a standalone version to test multiplayer functionality
4. Join the hosted game using the Join button

## Troubleshooting

- If you encounter network connection issues, make sure your Photon App ID is correctly configured
- If objects are not syncing properly, check that they have the NetworkObject component
- If the maze generation is not working, ensure the MazeGenerator script has all required prefab references 