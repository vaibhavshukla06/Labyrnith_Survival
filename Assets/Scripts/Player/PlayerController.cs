using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Fusion;
using LabyrinthSurvival.Networking;
using LabyrinthSurvival.Core;
using LabyrinthSurvival.UI;

namespace LabyrinthSurvival.Player
{
    /// <summary>
    /// Handles player movement, input, and network synchronization.
    /// </summary>
    [RequireComponent(typeof(NetworkTransform))]
    [RequireComponent(typeof(NetworkRigidbody))]
    public class PlayerController : NetworkBehaviour
    {
        [Header("Movement Settings")]
        [SerializeField] private float moveSpeed = 5f;
        [SerializeField] private float rotationSpeed = 120f;
        [SerializeField] private float jumpForce = 5f;
        [SerializeField] private float gravity = 20f;
        
        [Header("Ground Check")]
        [SerializeField] private Transform groundCheck;
        [SerializeField] private float groundDistance = 0.4f;
        [SerializeField] private LayerMask groundMask;
        
        [Header("Player Model")]
        [SerializeField] private GameObject localPlayerModel;
        [SerializeField] private GameObject remotePlayerModel;
        
        [Header("Health Settings")]
        [SerializeField] private float maxHealth = 100f;
        [SerializeField] private float healthRegenRate = 5f;
        
        // Components
        private NetworkTransform _networkTransform;
        private NetworkRigidbody _networkRigidbody;
        private CharacterController _characterController;
        private Camera _playerCamera;
        
        // Movement variables
        private Vector3 _moveDirection = Vector3.zero;
        private bool _isGrounded;
        private float _verticalVelocity;
        
        // Network state
        [Networked] public bool HasEscaped { get; set; }
        [Networked] private float _currentHealth { get; set; }
        [Networked] private NetworkBool _isInvulnerable { get; set; }
        
        // Inventory
        private List<InventoryItem> _inventory = new List<InventoryItem>();
        
        // Static reference to local player
        public static PlayerController Local { get; private set; }
        
        // Network input structure
        public struct NetworkInputData : INetworkInput
        {
            public Vector2 MovementInput;
            public NetworkBool Jump;
            public NetworkBool Interact;
            public NetworkBool ToggleInventory;
        }
        
        public override void Spawned()
        {
            base.Spawned();
            
            // Get components
            _networkTransform = GetComponent<NetworkTransform>();
            _networkRigidbody = GetComponent<NetworkRigidbody>();
            _characterController = GetComponent<CharacterController>();
            
            // Initialize network state
            HasEscaped = false;
            _currentHealth = maxHealth;
            _isInvulnerable = false;
            
            // Set up player model based on whether this is the local player
            if (Object.HasInputAuthority)
            {
                Local = this;
                
                // Set up camera for local player
                _playerCamera = Camera.main;
                if (_playerCamera != null)
                {
                    _playerCamera.transform.SetParent(transform);
                    _playerCamera.transform.localPosition = new Vector3(0, 1.7f, 0);
                    _playerCamera.transform.localRotation = Quaternion.identity;
                }
                
                // Show local player model, hide remote model
                if (localPlayerModel != null) localPlayerModel.SetActive(true);
                if (remotePlayerModel != null) remotePlayerModel.SetActive(false);
                
                // Update UI
                if (UIManager.Instance != null)
                {
                    UIManager.Instance.UpdateHealthBar(_currentHealth, maxHealth);
                }
            }
            else
            {
                // Show remote player model, hide local model
                if (localPlayerModel != null) localPlayerModel.SetActive(false);
                if (remotePlayerModel != null) remotePlayerModel.SetActive(true);
            }
        }
        
        public override void Despawned(NetworkRunner runner, bool hasState)
        {
            base.Despawned(runner, hasState);
            
            // Clear local player reference if this is the local player
            if (Object.HasInputAuthority)
            {
                Local = null;
            }
        }
        
        /// <summary>
        /// Gets the network input data from the local player.
        /// </summary>
        public NetworkInputData GetNetworkInput()
        {
            NetworkInputData input = new NetworkInputData();
            
            // Movement input
            input.MovementInput = new Vector2(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"));
            
            // Jump input
            input.Jump = Input.GetButtonDown("Jump");
            
            // Interact input
            input.Interact = Input.GetButtonDown("Fire1") || Input.GetKeyDown(KeyCode.E);
            
            // Toggle inventory
            input.ToggleInventory = Input.GetKeyDown(KeyCode.I) || Input.GetKeyDown(KeyCode.Tab);
            
            return input;
        }
        
        public override void FixedUpdateNetwork()
        {
            // Only process movement on the server or in single player
            if (Object.HasStateAuthority == false && Runner.IsForward == false)
                return;
            
            // Get the input from the network
            if (GetInput(out NetworkInputData input))
            {
                // Process movement
                Move(input);
                
                // Process jump
                if (input.Jump)
                {
                    Jump();
                }
                
                // Process interact
                if (input.Interact)
                {
                    Interact();
                }
                
                // Toggle inventory
                if (input.ToggleInventory && Object.HasInputAuthority)
                {
                    ToggleInventory();
                }
            }
            
            // Health regeneration
            if (Object.HasStateAuthority && _currentHealth < maxHealth && !HasEscaped)
            {
                _currentHealth += healthRegenRate * Runner.DeltaTime;
                _currentHealth = Mathf.Min(_currentHealth, maxHealth);
            }
        }
        
        public override void Render()
        {
            // Update UI for local player
            if (Object.HasInputAuthority && UIManager.Instance != null)
            {
                UIManager.Instance.UpdateHealthBar(_currentHealth, maxHealth);
            }
        }
        
        private void Move(NetworkInputData input)
        {
            // Don't move if player has escaped
            if (HasEscaped)
                return;
            
            // Check if the player is grounded
            _isGrounded = Physics.CheckSphere(groundCheck.position, groundDistance, groundMask);
            
            if (_isGrounded && _verticalVelocity < 0)
            {
                _verticalVelocity = -2f; // Small negative value to keep the player grounded
            }
            
            // Apply gravity
            _verticalVelocity -= gravity * Runner.DeltaTime;
            
            // Calculate movement direction
            Vector3 forward = transform.forward * input.MovementInput.y;
            Vector3 right = transform.right * input.MovementInput.x;
            Vector3 moveDirection = (forward + right).normalized;
            
            // Apply movement
            Vector3 move = moveDirection * moveSpeed * Runner.DeltaTime;
            move.y = _verticalVelocity * Runner.DeltaTime;
            
            // Move the character
            _characterController.Move(move);
            
            // Rotate the player based on movement direction
            if (moveDirection != Vector3.zero)
            {
                Quaternion targetRotation = Quaternion.LookRotation(moveDirection);
                transform.rotation = Quaternion.RotateTowards(
                    transform.rotation,
                    targetRotation,
                    rotationSpeed * Runner.DeltaTime
                );
            }
        }
        
        private void Jump()
        {
            // Don't jump if player has escaped
            if (HasEscaped)
                return;
            
            if (_isGrounded)
            {
                _verticalVelocity = jumpForce;
            }
        }
        
        private void Interact()
        {
            // Don't interact if player has escaped
            if (HasEscaped)
                return;
            
            // Raycast to detect interactable objects
            if (Physics.Raycast(transform.position + Vector3.up, transform.forward, out RaycastHit hit, 2f))
            {
                // Check if the hit object has an interactable component
                IInteractable interactable = hit.collider.GetComponent<IInteractable>();
                if (interactable != null)
                {
                    interactable.Interact(this);
                }
            }
        }
        
        private void ToggleInventory()
        {
            // Don't toggle inventory if player has escaped
            if (HasEscaped)
                return;
            
            if (UIManager.Instance != null)
            {
                UIManager.Instance.ToggleInventory();
                UIManager.Instance.UpdateInventory(_inventory);
            }
        }
        
        /// <summary>
        /// Applies damage to the player.
        /// </summary>
        /// <param name="damage">The amount of damage to apply.</param>
        /// <returns>True if the player died, false otherwise.</returns>
        public bool TakeDamage(float damage)
        {
            // Only process damage on the server
            if (!Object.HasStateAuthority)
                return false;
            
            // Don't take damage if invulnerable or already escaped
            if (_isInvulnerable || HasEscaped)
                return false;
            
            // Apply damage
            _currentHealth -= damage;
            
            // Check if player died
            if (_currentHealth <= 0)
            {
                _currentHealth = 0;
                Die();
                return true;
            }
            
            // Apply brief invulnerability
            StartCoroutine(ApplyInvulnerability(1f));
            
            return false;
        }
        
        /// <summary>
        /// Applies a brief period of invulnerability.
        /// </summary>
        private IEnumerator ApplyInvulnerability(float duration)
        {
            _isInvulnerable = true;
            yield return new WaitForSeconds(duration);
            _isInvulnerable = false;
        }
        
        /// <summary>
        /// Handles player death.
        /// </summary>
        private void Die()
        {
            Debug.Log("Player died");
            
            // Notify GameManager
            GameManager gameManager = FindObjectOfType<GameManager>();
            if (gameManager != null)
            {
                gameManager.PlayerTrapped(Object.InputAuthority);
            }
            
            // In a real game, you might respawn the player or show a death screen
            // For now, we'll just disable movement and make the player transparent
            if (localPlayerModel != null)
            {
                Renderer[] renderers = localPlayerModel.GetComponentsInChildren<Renderer>();
                foreach (Renderer renderer in renderers)
                {
                    Color color = renderer.material.color;
                    color.a = 0.5f;
                    renderer.material.color = color;
                }
            }
            
            if (remotePlayerModel != null)
            {
                Renderer[] renderers = remotePlayerModel.GetComponentsInChildren<Renderer>();
                foreach (Renderer renderer in renderers)
                {
                    Color color = renderer.material.color;
                    color.a = 0.5f;
                    renderer.material.color = color;
                }
            }
        }
        
        /// <summary>
        /// Called when the player reaches the exit.
        /// </summary>
        public void Escape()
        {
            // Only process escape on the server
            if (!Object.HasStateAuthority)
                return;
            
            // Set escaped state
            HasEscaped = true;
            
            // Notify GameManager
            GameManager gameManager = FindObjectOfType<GameManager>();
            if (gameManager != null)
            {
                gameManager.PlayerEscaped(Object.InputAuthority);
            }
            
            // Show escape message for local player
            if (Object.HasInputAuthority && UIManager.Instance != null)
            {
                UIManager.Instance.UpdateObjectiveText("You escaped the labyrinth!");
            }
        }
        
        /// <summary>
        /// Adds an item to the player's inventory.
        /// </summary>
        public void AddItem(InventoryItem item)
        {
            _inventory.Add(item);
            
            // Update inventory UI if this is the local player
            if (Object.HasInputAuthority && UIManager.Instance != null)
            {
                UIManager.Instance.UpdateInventory(_inventory);
            }
        }
        
        /// <summary>
        /// Uses an item from the player's inventory.
        /// </summary>
        public void UseItem(InventoryItem item)
        {
            // Process item use based on type
            switch (item.Type)
            {
                case InventoryItem.ItemType.Weapon:
                    // Use weapon
                    break;
                case InventoryItem.ItemType.Tool:
                    // Use tool
                    break;
                case InventoryItem.ItemType.Resource:
                    // Use resource
                    break;
                case InventoryItem.ItemType.Consumable:
                    // Use consumable (e.g., health potion)
                    if (Object.HasStateAuthority)
                    {
                        _currentHealth = Mathf.Min(_currentHealth + 25f, maxHealth);
                    }
                    break;
            }
            
            // Remove item from inventory
            _inventory.Remove(item);
            
            // Update inventory UI if this is the local player
            if (Object.HasInputAuthority && UIManager.Instance != null)
            {
                UIManager.Instance.UpdateInventory(_inventory);
            }
        }
    }
    
    /// <summary>
    /// Interface for objects that can be interacted with by the player.
    /// </summary>
    public interface IInteractable
    {
        void Interact(PlayerController player);
    }
} 