using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Fusion;
using LabyrinthSurvival.Player;

namespace LabyrinthSurvival.Core
{
    /// <summary>
    /// Handles the exit trigger that allows players to escape the maze.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public class ExitTrigger : NetworkBehaviour, IInteractable
    {
        [Header("Exit Settings")]
        [SerializeField] private float escapeTime = 3f; // Time it takes to escape
        [SerializeField] private GameObject exitEffectPrefab;
        
        [Header("Audio")]
        [SerializeField] private AudioClip exitSound;
        
        // Components
        private Collider _collider;
        private AudioSource _audioSource;
        
        // Player tracking
        private Dictionary<PlayerController, float> _escapingPlayers = new Dictionary<PlayerController, float>();
        
        private void Awake()
        {
            _collider = GetComponent<Collider>();
            _audioSource = GetComponent<AudioSource>();
            
            // Ensure the collider is a trigger
            _collider.isTrigger = true;
        }
        
        public override void FixedUpdateNetwork()
        {
            // Only process on the server
            if (!Object.HasStateAuthority)
                return;
            
            // Update escaping players
            List<PlayerController> playersToRemove = new List<PlayerController>();
            
            foreach (var kvp in _escapingPlayers)
            {
                PlayerController player = kvp.Key;
                float timeRemaining = kvp.Value - Runner.DeltaTime;
                
                // Check if player is still in range
                if (!IsPlayerInRange(player))
                {
                    playersToRemove.Add(player);
                    continue;
                }
                
                // Update time remaining
                _escapingPlayers[player] = timeRemaining;
                
                // Check if escape time has elapsed
                if (timeRemaining <= 0)
                {
                    // Player has escaped
                    player.Escape();
                    playersToRemove.Add(player);
                    
                    // Play exit effect
                    if (exitEffectPrefab != null)
                    {
                        Runner.Spawn(
                            exitEffectPrefab,
                            player.transform.position,
                            Quaternion.identity
                        );
                    }
                    
                    // Play exit sound
                    if (_audioSource != null && exitSound != null)
                    {
                        _audioSource.PlayOneShot(exitSound);
                    }
                }
            }
            
            // Remove players that have escaped or left the trigger
            foreach (PlayerController player in playersToRemove)
            {
                _escapingPlayers.Remove(player);
            }
        }
        
        /// <summary>
        /// Called when a player interacts with the exit.
        /// </summary>
        public void Interact(PlayerController player)
        {
            // Only process on the server
            if (!Object.HasStateAuthority)
                return;
            
            // Check if player is already escaping
            if (_escapingPlayers.ContainsKey(player))
                return;
            
            // Check if player has already escaped
            if (player.HasEscaped)
                return;
            
            // Start escape process
            _escapingPlayers.Add(player, escapeTime);
            
            // Notify player
            RPC_NotifyEscapeStarted(player.Object.InputAuthority);
        }
        
        /// <summary>
        /// Checks if a player is in range of the exit.
        /// </summary>
        private bool IsPlayerInRange(PlayerController player)
        {
            if (player == null)
                return false;
            
            // Check distance to exit
            float distance = Vector3.Distance(transform.position, player.transform.position);
            return distance < 3f; // Adjust range as needed
        }
        
        /// <summary>
        /// Notifies a player that they have started escaping.
        /// </summary>
        [Rpc(RpcSources.StateAuthority, RpcTargets.All)]
        private void RPC_NotifyEscapeStarted(PlayerRef playerRef)
        {
            // Find the player object
            foreach (var player in Runner.ActivePlayers)
            {
                if (player == playerRef)
                {
                    // Show escape message for local player
                    if (PlayerController.Local != null && PlayerController.Local.Object.InputAuthority == playerRef)
                    {
                        Debug.Log("You are escaping the labyrinth...");
                        
                        // In a real game, you would show a UI element with a progress bar
                    }
                    break;
                }
            }
        }
        
        private void OnTriggerEnter(Collider other)
        {
            // Check if the collider belongs to a player
            PlayerController player = other.GetComponent<PlayerController>();
            if (player != null && Object.HasStateAuthority)
            {
                // Start escape process if player interacts with the exit
                if (!_escapingPlayers.ContainsKey(player) && !player.HasEscaped)
                {
                    _escapingPlayers.Add(player, escapeTime);
                    RPC_NotifyEscapeStarted(player.Object.InputAuthority);
                }
            }
        }
        
        private void OnTriggerExit(Collider other)
        {
            // Check if the collider belongs to a player
            PlayerController player = other.GetComponent<PlayerController>();
            if (player != null && Object.HasStateAuthority)
            {
                // Remove player from escaping players
                if (_escapingPlayers.ContainsKey(player))
                {
                    _escapingPlayers.Remove(player);
                    
                    // Notify player that escape was interrupted
                    if (PlayerController.Local != null && PlayerController.Local == player)
                    {
                        Debug.Log("Escape interrupted!");
                    }
                }
            }
        }
    }
} 