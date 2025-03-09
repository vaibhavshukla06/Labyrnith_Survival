using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Fusion;
using LabyrinthSurvival.Networking;
using LabyrinthSurvival.Player;
using LabyrinthSurvival.Procedural;
using LabyrinthSurvival.UI;
using LabyrinthSurvival.AI;

namespace LabyrinthSurvival.Core
{
    /// <summary>
    /// Manages the overall game flow, rules, and game modes.
    /// </summary>
    public class GameManager : NetworkBehaviour
    {
        [Header("Game Settings")]
        [SerializeField] private float gameTimeLimit = 600f; // 10 minutes
        [SerializeField] private int maxPlayers = 8;
        [SerializeField] private int monstersPerPlayer = 2;
        [SerializeField] private float monsterSpawnInterval = 60f; // 1 minute
        
        [Header("Game Modes")]
        [SerializeField] private GameMode currentGameMode = GameMode.Coop;
        
        [Header("Prefabs")]
        [SerializeField] private NetworkPrefabRef monsterPrefab;
        [SerializeField] private NetworkPrefabRef itemPrefab;
        
        // Network state
        [Networked] private float GameTimer { get; set; }
        [Networked] private ushort PlayersEscaped { get; set; }
        [Networked] private ushort PlayersTrapped { get; set; }
        [Networked] private NetworkBool IsGameOver { get; set; }
        
        // References
        private MazeGenerator _mazeGenerator;
        private UIManager _uiManager;
        private NetworkManager _networkManager;
        
        // Local state
        private float _nextMonsterSpawnTime;
        private List<NetworkObject> _spawnedMonsters = new List<NetworkObject>();
        
        // Game modes
        public enum GameMode
        {
            Coop,       // All players work together to escape
            Betrayal,   // Only one player can escape
            PvP         // Players can sabotage each other
        }
        
        public override void Spawned()
        {
            base.Spawned();
            
            // Get references
            _mazeGenerator = FindObjectOfType<MazeGenerator>();
            _uiManager = UIManager.Instance;
            _networkManager = NetworkManager.Instance;
            
            // Initialize game state
            GameTimer = 0f;
            PlayersEscaped = 0;
            PlayersTrapped = 0;
            IsGameOver = false;
            
            // Set up monster spawning
            _nextMonsterSpawnTime = monsterSpawnInterval;
            
            // Set up event listeners
            NetworkManager.OnPlayerJoined += OnPlayerJoined;
            NetworkManager.OnPlayerLeft += OnPlayerLeft;
            
            // Start the game
            if (Object.HasStateAuthority)
            {
                StartGame();
            }
        }
        
        public override void FixedUpdateNetwork()
        {
            // Only run game logic on the server
            if (!Object.HasStateAuthority)
                return;
            
            // Update game timer
            GameTimer += Runner.DeltaTime;
            
            // Check for game over conditions
            CheckGameOverConditions();
            
            // Spawn monsters periodically
            if (GameTimer >= _nextMonsterSpawnTime)
            {
                SpawnMonsters();
                _nextMonsterSpawnTime = GameTimer + monsterSpawnInterval;
            }
        }
        
        public override void Render()
        {
            // Update UI
            if (_uiManager != null)
            {
                // Update timer display
                int minutes = Mathf.FloorToInt(GameTimer / 60f);
                int seconds = Mathf.FloorToInt(GameTimer % 60f);
                string timeText = string.Format("{0:00}:{1:00}", minutes, seconds);
                
                // Update objective text based on game mode
                string objectiveText = GetObjectiveText();
                
                // Update UI
                _uiManager.UpdateObjectiveText($"{objectiveText}\nTime: {timeText}");
            }
        }
        
        private void OnDestroy()
        {
            // Clean up event listeners
            if (NetworkManager.Instance != null)
            {
                NetworkManager.OnPlayerJoined -= OnPlayerJoined;
                NetworkManager.OnPlayerLeft -= OnPlayerLeft;
            }
        }
        
        #region Game Flow
        
        /// <summary>
        /// Starts the game.
        /// </summary>
        private void StartGame()
        {
            Debug.Log("Starting game...");
            
            // Generate the maze
            if (_mazeGenerator != null)
            {
                _mazeGenerator.RegenerateMaze();
            }
            
            // Spawn initial monsters
            SpawnMonsters();
            
            // Spawn items
            SpawnItems();
            
            // Show game HUD
            if (_uiManager != null)
            {
                _uiManager.ShowGameHUD();
            }
        }
        
        /// <summary>
        /// Ends the game with the specified outcome.
        /// </summary>
        private void EndGame(bool allPlayersEscaped)
        {
            Debug.Log("Game over!");
            
            // Set game over state
            IsGameOver = true;
            
            // Show game over screen
            if (_uiManager != null)
            {
                string message;
                bool isVictory;
                
                switch (currentGameMode)
                {
                    case GameMode.Coop:
                        isVictory = allPlayersEscaped;
                        message = isVictory ? "All players escaped! Victory!" : "Not everyone escaped. Game over!";
                        break;
                    case GameMode.Betrayal:
                        isVictory = PlayerController.Local != null && PlayerController.Local.HasEscaped;
                        message = isVictory ? "You escaped! Victory!" : "You were betrayed and left behind!";
                        break;
                    case GameMode.PvP:
                        isVictory = PlayerController.Local != null && PlayerController.Local.HasEscaped;
                        message = isVictory ? "You escaped! Victory!" : "You failed to escape!";
                        break;
                    default:
                        isVictory = false;
                        message = "Game over!";
                        break;
                }
                
                _uiManager.ShowGameOver(message, isVictory);
            }
        }
        
        /// <summary>
        /// Checks for game over conditions based on the current game mode.
        /// </summary>
        private void CheckGameOverConditions()
        {
            if (IsGameOver)
                return;
            
            int totalPlayers = Runner.ActivePlayers.Count;
            bool timeUp = GameTimer >= gameTimeLimit;
            
            // Game over conditions based on game mode
            switch (currentGameMode)
            {
                case GameMode.Coop:
                    // All players must escape, or time runs out
                    if (PlayersEscaped == totalPlayers || timeUp)
                    {
                        EndGame(PlayersEscaped == totalPlayers);
                    }
                    break;
                    
                case GameMode.Betrayal:
                    // Game ends when one player escapes or time runs out
                    if (PlayersEscaped > 0 || timeUp)
                    {
                        EndGame(PlayersEscaped > 0);
                    }
                    break;
                    
                case GameMode.PvP:
                    // Game ends when all players have either escaped or been trapped, or time runs out
                    if (PlayersEscaped + PlayersTrapped == totalPlayers || timeUp)
                    {
                        EndGame(PlayersEscaped > 0);
                    }
                    break;
            }
        }
        
        #endregion
        
        #region Spawning
        
        /// <summary>
        /// Spawns monsters based on the number of players.
        /// </summary>
        private void SpawnMonsters()
        {
            int totalPlayers = Runner.ActivePlayers.Count;
            int monstersToSpawn = totalPlayers * monstersPerPlayer - _spawnedMonsters.Count;
            
            for (int i = 0; i < monstersToSpawn; i++)
            {
                // Find a random spawn position away from players
                Vector3 spawnPosition = FindMonsterSpawnPosition();
                
                // Spawn the monster
                NetworkObject monsterObject = Runner.Spawn(
                    monsterPrefab,
                    spawnPosition,
                    Quaternion.identity,
                    null,
                    (runner, obj) => {
                        // Initialize monster
                        MonsterAI monsterAI = obj.GetComponent<MonsterAI>();
                        if (monsterAI != null)
                        {
                            // Any additional setup can go here
                        }
                    }
                );
                
                // Add to list of spawned monsters
                _spawnedMonsters.Add(monsterObject);
            }
        }
        
        /// <summary>
        /// Finds a suitable spawn position for a monster, away from players.
        /// </summary>
        private Vector3 FindMonsterSpawnPosition()
        {
            // Get maze dimensions
            float mazeWidth = 40f; // Assuming 20x20 maze with 2 unit cells
            float mazeHeight = 40f;
            
            // Try to find a position away from players
            for (int attempts = 0; attempts < 10; attempts++)
            {
                // Random position within maze bounds
                Vector3 position = new Vector3(
                    Random.Range(2f, mazeWidth - 2f),
                    0.5f,
                    Random.Range(2f, mazeHeight - 2f)
                );
                
                // Check distance to all players
                bool isTooClose = false;
                foreach (var player in Runner.ActivePlayers)
                {
                    PlayerController playerController = Runner.GetPlayerObject(player)?.GetComponent<PlayerController>();
                    if (playerController != null)
                    {
                        float distance = Vector3.Distance(position, playerController.transform.position);
                        if (distance < 10f) // Minimum distance from players
                        {
                            isTooClose = true;
                            break;
                        }
                    }
                }
                
                if (!isTooClose)
                {
                    return position;
                }
            }
            
            // Fallback: return a random position
            return new Vector3(
                Random.Range(2f, mazeWidth - 2f),
                0.5f,
                Random.Range(2f, mazeHeight - 2f)
            );
        }
        
        /// <summary>
        /// Spawns items throughout the maze.
        /// </summary>
        private void SpawnItems()
        {
            // Get maze dimensions
            float mazeWidth = 40f; // Assuming 20x20 maze with 2 unit cells
            float mazeHeight = 40f;
            
            // Spawn a number of items
            int itemsToSpawn = 20; // Adjust as needed
            
            for (int i = 0; i < itemsToSpawn; i++)
            {
                // Random position within maze bounds
                Vector3 position = new Vector3(
                    Random.Range(2f, mazeWidth - 2f),
                    0.5f,
                    Random.Range(2f, mazeHeight - 2f)
                );
                
                // Random item type
                int itemType = Random.Range(0, 4); // 0-3 for different item types
                
                // Spawn the item
                Runner.Spawn(
                    itemPrefab,
                    position,
                    Quaternion.identity,
                    null,
                    (runner, obj) => {
                        // Initialize item
                        ItemPickup itemPickup = obj.GetComponent<ItemPickup>();
                        if (itemPickup != null)
                        {
                            itemPickup.SetItemType((ItemPickup.ItemType)itemType);
                        }
                    }
                );
            }
        }
        
        #endregion
        
        #region Event Handlers
        
        /// <summary>
        /// Called when a player joins the game.
        /// </summary>
        private void OnPlayerJoined(PlayerRef player, NetworkObject playerObject)
        {
            Debug.Log($"Player {player} joined the game");
            
            // Additional setup for the player can go here
        }
        
        /// <summary>
        /// Called when a player leaves the game.
        /// </summary>
        private void OnPlayerLeft(PlayerRef player)
        {
            Debug.Log($"Player {player} left the game");
            
            // Handle player leaving based on game mode
            if (Object.HasStateAuthority)
            {
                // In co-op mode, if a player leaves, they're considered trapped
                if (currentGameMode == GameMode.Coop)
                {
                    PlayersTrapped++;
                    CheckGameOverConditions();
                }
            }
        }
        
        #endregion
        
        #region Helper Methods
        
        /// <summary>
        /// Gets the objective text based on the current game mode.
        /// </summary>
        private string GetObjectiveText()
        {
            switch (currentGameMode)
            {
                case GameMode.Coop:
                    return "Objective: Work together to find the exit and escape!";
                case GameMode.Betrayal:
                    return "Objective: Be the first to find the exit and escape!";
                case GameMode.PvP:
                    return "Objective: Find the exit and escape, or prevent others from escaping!";
                default:
                    return "Objective: Find the exit and escape the labyrinth!";
            }
        }
        
        /// <summary>
        /// Called when a player escapes the maze.
        /// </summary>
        public void PlayerEscaped(PlayerRef player)
        {
            if (Object.HasStateAuthority)
            {
                PlayersEscaped++;
                Debug.Log($"Player {player} escaped! ({PlayersEscaped}/{Runner.ActivePlayers.Count})");
                
                // Check game over conditions
                CheckGameOverConditions();
            }
        }
        
        /// <summary>
        /// Called when a player is trapped (e.g., killed by a monster).
        /// </summary>
        public void PlayerTrapped(PlayerRef player)
        {
            if (Object.HasStateAuthority)
            {
                PlayersTrapped++;
                Debug.Log($"Player {player} trapped! ({PlayersTrapped}/{Runner.ActivePlayers.Count})");
                
                // Check game over conditions
                CheckGameOverConditions();
            }
        }
        
        #endregion
    }
    
    /// <summary>
    /// Represents an item that can be picked up by players.
    /// </summary>
    public class ItemPickup : NetworkBehaviour, IInteractable
    {
        [SerializeField] private MeshRenderer meshRenderer;
        [SerializeField] private Material[] itemMaterials;
        
        [Networked] private ItemType _itemType { get; set; }
        
        public enum ItemType
        {
            Key,
            Weapon,
            Health,
            Tool
        }
        
        public override void Spawned()
        {
            base.Spawned();
            
            // Set material based on item type
            if (meshRenderer != null && itemMaterials != null && itemMaterials.Length > (int)_itemType)
            {
                meshRenderer.material = itemMaterials[(int)_itemType];
            }
        }
        
        public void SetItemType(ItemType type)
        {
            _itemType = type;
        }
        
        public void Interact(PlayerController player)
        {
            Debug.Log($"Player picked up {_itemType}");
            
            // Add item to player's inventory
            // player.AddItem(_itemType);
            
            // Despawn the item
            if (Object.HasStateAuthority)
            {
                Runner.Despawn(Object);
            }
        }
    }
} 