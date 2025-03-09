using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Fusion;
using Fusion.Sockets;
using System.Threading.Tasks;
using UnityEngine.SceneManagement;
using io = io;

namespace LabyrinthSurvival.Networking
{
    /// <summary>
    /// Handles all network-related functionality using Photon Fusion.
    /// </summary>
    public class NetworkManager : MonoBehaviour, INetworkRunnerCallbacks
    {
        [Header("Network Settings")]
        [SerializeField] private GameMode defaultGameMode = GameMode.Host;
        [SerializeField] private string roomName = "LabyrinthSurvival";
        [SerializeField] private int maxPlayers = 8;
        
        [Header("Player Prefab")]
        [SerializeField] private NetworkPrefabRef playerPrefab;
        [SerializeField] private Transform[] spawnPoints;
        
        // Network objects
        private NetworkRunner _runner;
        private Dictionary<PlayerRef, NetworkObject> _spawnedPlayers = new Dictionary<PlayerRef, NetworkObject>();
        
        // Events
        public static event Action<NetworkRunner> OnNetworkRunnerInitialized;
        public static event Action<PlayerRef, NetworkObject> OnPlayerJoined;
        public static event Action<PlayerRef> OnPlayerLeft;
        
        // Singleton instance
        public static NetworkManager Instance { get; private set; }
        
        private void Awake()
        {
            // Singleton pattern
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        
        /// <summary>
        /// Starts a game session with the specified game mode.
        /// </summary>
        /// <param name="mode">The game mode to use (Host, Client, etc.)</param>
        public async void StartGame(GameMode mode)
        {
            // Create the Fusion runner and let it know that we will be providing user input
            _runner = gameObject.AddComponent<NetworkRunner>();
            _runner.ProvideInput = true;
            
            // Create the NetworkSceneInfo from the current scene
            var scene = SceneRef.FromIndex(SceneManager.GetActiveScene().buildIndex);
            var sceneInfo = new NetworkSceneInfo();
            if (scene.IsValid)
            {
                sceneInfo.AddSceneRef(scene, LoadSceneMode.Additive);
            }
            
            // Start or join a session with the specified name
            await _runner.StartGame(new StartGameArgs()
            {
                GameMode = mode,
                SessionName = roomName,
                Scene = scene,
                SceneManager = gameObject.AddComponent<NetworkSceneManagerDefault>(),
                PlayerCount = maxPlayers
            });
            
            // Notify listeners that the runner has been initialized
            OnNetworkRunnerInitialized?.Invoke(_runner);
        }
        
        /// <summary>
        /// Disconnects from the current session.
        /// </summary>
        public async void Disconnect()
        {
            if (_runner != null)
            {
                await _runner.Shutdown();
            }
        }
        
        #region INetworkRunnerCallbacks Implementation
        
        public void OnPlayerJoined(NetworkRunner runner, PlayerRef player)
        {
            Debug.Log($"Player {player} joined");
            
            // Get a spawn point for the player
            Vector3 spawnPosition = Vector3.zero;
            Quaternion spawnRotation = Quaternion.identity;
            
            if (spawnPoints != null && spawnPoints.Length > 0)
            {
                Transform spawnPoint = spawnPoints[UnityEngine.Random.Range(0, spawnPoints.Length)];
                spawnPosition = spawnPoint.position;
                spawnRotation = spawnPoint.rotation;
            }
            
            // Spawn the player
            NetworkObject playerObject = runner.Spawn(
                playerPrefab,
                spawnPosition,
                spawnRotation,
                player
            );
            
            // Store reference to the spawned player
            _spawnedPlayers[player] = playerObject;
            
            // Notify listeners that a player has joined
            OnPlayerJoined?.Invoke(player, playerObject);
        }
        
        public void OnPlayerLeft(NetworkRunner runner, PlayerRef player)
        {
            Debug.Log($"Player {player} left");
            
            // Find and despawn the player object
            if (_spawnedPlayers.TryGetValue(player, out NetworkObject playerObject))
            {
                runner.Despawn(playerObject);
                _spawnedPlayers.Remove(player);
            }
            
            // Notify listeners that a player has left
            OnPlayerLeft?.Invoke(player);
        }
        
        public void OnInput(NetworkRunner runner, NetworkInput input)
        {
            // Get input from the local player controller
            if (PlayerController.Local != null)
            {
                input.Set(PlayerController.Local.GetNetworkInput());
            }
        }
        
        public void OnInputMissing(NetworkRunner runner, PlayerRef player, NetworkInput input) { }
        
        public void OnShutdown(NetworkRunner runner, ShutdownReason shutdownReason)
        {
            Debug.Log($"Network shutdown: {shutdownReason}");
            
            // Clean up
            _spawnedPlayers.Clear();
            
            // Return to main menu or handle shutdown
            SceneManager.LoadScene("MainMenu");
        }
        
        public void OnConnectedToServer(NetworkRunner runner) 
        {
            Debug.Log("Connected to server");
        }
        
        public void OnDisconnectedFromServer(NetworkRunner runner)
        {
            Debug.Log("Disconnected from server");
        }
        
        public void OnConnectRequest(NetworkRunner runner, NetworkRunnerCallbackArgs.ConnectRequest request, byte[] token) 
        {
            // Accept all connection requests
            request.Accept();
        }
        
        public void OnConnectFailed(NetworkRunner runner, NetAddress remoteAddress, NetConnectFailedReason reason)
        {
            Debug.LogError($"Connection failed: {reason}");
        }
        
        public void OnUserSimulationMessage(NetworkRunner runner, SimulationMessagePtr message) { }
        
        public void OnSessionListUpdated(NetworkRunner runner, List<SessionInfo> sessionList) { }
        
        public void OnCustomAuthenticationResponse(NetworkRunner runner, Dictionary<string, object> data) { }
        
        public void OnHostMigration(NetworkRunner runner, HostMigrationToken hostMigrationToken) { }
        
        public void OnReliableDataReceived(NetworkRunner runner, PlayerRef player, ArraySegment<byte> data) { }
        
        public void OnSceneLoadDone(NetworkRunner runner) { }
        
        public void OnSceneLoadStart(NetworkRunner runner) { }
        
        #endregion

        private void Start()
        {
            // Initialize socket
            io.connect();
            setupSocketListeners();
        }

        private void setupSocketListeners()
        {
            // Handle connection
            io.on('connect', () => {
                localPlayerId = io.id;
                Debug.Log('Connected with ID:', localPlayerId);
            });
            
            // Handle player join
            io.on('playerJoined', (playerData) => {
                addPlayer(playerData);
            });
            
            // Handle player movement
            io.on('playerMoved', (playerData) => {
                updatePlayerPosition(playerData);
            });
            
            // Handle player left
            io.on('playerLeft', (playerId) => {
                removePlayer(playerId);
            });
        }

        private void addPlayer(object playerData)
        {
            // Implementation of addPlayer method
        }

        private void updatePlayerPosition(object playerData)
        {
            // Implementation of updatePlayerPosition method
        }

        private void removePlayer(string playerId)
        {
            // Implementation of removePlayer method
        }
    }
} 