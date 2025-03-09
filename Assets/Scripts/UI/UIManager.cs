using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Fusion;
using LabyrinthSurvival.Networking;
using LabyrinthSurvival.Player;

namespace LabyrinthSurvival.UI
{
    /// <summary>
    /// Manages all UI elements in the game, including menus, HUD, and multiplayer lobby.
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        [Header("Panels")]
        [SerializeField] private GameObject mainMenuPanel;
        [SerializeField] private GameObject lobbyPanel;
        [SerializeField] private GameObject gameHUDPanel;
        [SerializeField] private GameObject pauseMenuPanel;
        [SerializeField] private GameObject gameOverPanel;
        
        [Header("Main Menu")]
        [SerializeField] private Button hostButton;
        [SerializeField] private Button joinButton;
        [SerializeField] private Button settingsButton;
        [SerializeField] private Button quitButton;
        
        [Header("Lobby")]
        [SerializeField] private Transform playerListContent;
        [SerializeField] private GameObject playerListItemPrefab;
        [SerializeField] private Button startGameButton;
        [SerializeField] private Button leaveLobbyButton;
        [SerializeField] private TMP_Dropdown gameModeDropdown;
        
        [Header("Game HUD")]
        [SerializeField] private Slider healthBar;
        [SerializeField] private TextMeshProUGUI timerText;
        [SerializeField] private TextMeshProUGUI objectiveText;
        [SerializeField] private GameObject inventoryPanel;
        [SerializeField] private Transform inventoryContent;
        [SerializeField] private GameObject inventoryItemPrefab;
        
        [Header("Pause Menu")]
        [SerializeField] private Button resumeButton;
        [SerializeField] private Button settingsButtonPause;
        [SerializeField] private Button mainMenuButton;
        
        [Header("Game Over")]
        [SerializeField] private TextMeshProUGUI gameOverText;
        [SerializeField] private Button playAgainButton;
        [SerializeField] private Button mainMenuButtonGameOver;
        
        // References
        private NetworkManager _networkManager;
        private Dictionary<PlayerRef, GameObject> _playerListItems = new Dictionary<PlayerRef, GameObject>();
        
        // Game state
        private bool _isPaused = false;
        private float _gameTimer = 0f;
        private bool _isGameActive = false;
        
        // Singleton instance
        public static UIManager Instance { get; private set; }
        
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
        
        private void Start()
        {
            // Get references
            _networkManager = NetworkManager.Instance;
            
            // Set up event listeners
            NetworkManager.OnPlayerJoined += OnPlayerJoined;
            NetworkManager.OnPlayerLeft += OnPlayerLeft;
            
            // Set up button listeners
            SetupButtonListeners();
            
            // Show main menu initially
            ShowMainMenu();
        }
        
        private void Update()
        {
            // Update game timer if game is active
            if (_isGameActive)
            {
                _gameTimer += Time.deltaTime;
                UpdateTimerDisplay();
                
                // Handle pause menu toggle
                if (Input.GetKeyDown(KeyCode.Escape))
                {
                    TogglePauseMenu();
                }
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
        
        #region Panel Management
        
        /// <summary>
        /// Shows the main menu and hides all other panels.
        /// </summary>
        public void ShowMainMenu()
        {
            HideAllPanels();
            mainMenuPanel.SetActive(true);
            
            // Reset game state
            _isGameActive = false;
            _gameTimer = 0f;
            
            // Unlock cursor
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }
        
        /// <summary>
        /// Shows the lobby panel and hides all other panels.
        /// </summary>
        public void ShowLobby()
        {
            HideAllPanels();
            lobbyPanel.SetActive(true);
            
            // Clear player list
            ClearPlayerList();
            
            // Only host can start the game
            startGameButton.gameObject.SetActive(false);
        }
        
        /// <summary>
        /// Shows the game HUD and hides all other panels.
        /// </summary>
        public void ShowGameHUD()
        {
            HideAllPanels();
            gameHUDPanel.SetActive(true);
            
            // Set game state
            _isGameActive = true;
            _gameTimer = 0f;
            
            // Lock cursor for first-person control
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
            
            // Set initial objective text
            objectiveText.text = "Find the exit and escape the labyrinth!";
        }
        
        /// <summary>
        /// Shows or hides the pause menu.
        /// </summary>
        public void TogglePauseMenu()
        {
            _isPaused = !_isPaused;
            pauseMenuPanel.SetActive(_isPaused);
            
            // Pause/unpause game
            Time.timeScale = _isPaused ? 0f : 1f;
            
            // Show/hide cursor
            Cursor.lockState = _isPaused ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = _isPaused;
        }
        
        /// <summary>
        /// Shows the game over screen with the specified message.
        /// </summary>
        /// <param name="message">The message to display on the game over screen.</param>
        /// <param name="isVictory">Whether the game ended in victory or defeat.</param>
        public void ShowGameOver(string message, bool isVictory)
        {
            HideAllPanels();
            gameOverPanel.SetActive(true);
            
            // Set game over text
            gameOverText.text = message;
            gameOverText.color = isVictory ? Color.green : Color.red;
            
            // Set game state
            _isGameActive = false;
            
            // Unlock cursor
            Cursor.lockState = CursorLockMode.None;
            Cursor.visible = true;
        }
        
        /// <summary>
        /// Hides all UI panels.
        /// </summary>
        private void HideAllPanels()
        {
            mainMenuPanel.SetActive(false);
            lobbyPanel.SetActive(false);
            gameHUDPanel.SetActive(false);
            pauseMenuPanel.SetActive(false);
            gameOverPanel.SetActive(false);
            inventoryPanel.SetActive(false);
        }
        
        #endregion
        
        #region Button Listeners
        
        /// <summary>
        /// Sets up all button click listeners.
        /// </summary>
        private void SetupButtonListeners()
        {
            // Main Menu
            hostButton.onClick.AddListener(OnHostButtonClicked);
            joinButton.onClick.AddListener(OnJoinButtonClicked);
            settingsButton.onClick.AddListener(OnSettingsButtonClicked);
            quitButton.onClick.AddListener(OnQuitButtonClicked);
            
            // Lobby
            startGameButton.onClick.AddListener(OnStartGameButtonClicked);
            leaveLobbyButton.onClick.AddListener(OnLeaveLobbyButtonClicked);
            
            // Pause Menu
            resumeButton.onClick.AddListener(OnResumeButtonClicked);
            settingsButtonPause.onClick.AddListener(OnSettingsButtonClicked);
            mainMenuButton.onClick.AddListener(OnMainMenuButtonClicked);
            
            // Game Over
            playAgainButton.onClick.AddListener(OnPlayAgainButtonClicked);
            mainMenuButtonGameOver.onClick.AddListener(OnMainMenuButtonClicked);
        }
        
        private void OnHostButtonClicked()
        {
            // Start hosting a game
            _networkManager.StartGame(GameMode.Host);
            
            // Show lobby
            ShowLobby();
            
            // Host can start the game
            startGameButton.gameObject.SetActive(true);
        }
        
        private void OnJoinButtonClicked()
        {
            // Join an existing game
            _networkManager.StartGame(GameMode.Client);
            
            // Show lobby
            ShowLobby();
            
            // Clients can't start the game
            startGameButton.gameObject.SetActive(false);
        }
        
        private void OnSettingsButtonClicked()
        {
            // Show settings panel (not implemented in this example)
            Debug.Log("Settings button clicked");
        }
        
        private void OnQuitButtonClicked()
        {
            // Quit the game
            #if UNITY_EDITOR
            UnityEditor.EditorApplication.isPlaying = false;
            #else
            Application.Quit();
            #endif
        }
        
        private void OnStartGameButtonClicked()
        {
            // Start the game (host only)
            // In a real game, you would load the game scene here
            ShowGameHUD();
        }
        
        private void OnLeaveLobbyButtonClicked()
        {
            // Leave the lobby and disconnect
            _networkManager.Disconnect();
            
            // Show main menu
            ShowMainMenu();
        }
        
        private void OnResumeButtonClicked()
        {
            // Resume the game
            TogglePauseMenu();
        }
        
        private void OnMainMenuButtonClicked()
        {
            // Return to main menu
            if (_isPaused)
            {
                // Unpause the game
                Time.timeScale = 1f;
                _isPaused = false;
            }
            
            // Disconnect from the network
            _networkManager.Disconnect();
            
            // Show main menu
            ShowMainMenu();
        }
        
        private void OnPlayAgainButtonClicked()
        {
            // Play again (restart the game)
            // In a real game, you would reload the game scene here
            ShowLobby();
        }
        
        #endregion
        
        #region Player List Management
        
        /// <summary>
        /// Called when a player joins the game.
        /// </summary>
        private void OnPlayerJoined(PlayerRef player, NetworkObject playerObject)
        {
            // Add player to the lobby list
            if (lobbyPanel.activeSelf)
            {
                AddPlayerToList(player, playerObject);
            }
        }
        
        /// <summary>
        /// Called when a player leaves the game.
        /// </summary>
        private void OnPlayerLeft(PlayerRef player)
        {
            // Remove player from the lobby list
            if (lobbyPanel.activeSelf)
            {
                RemovePlayerFromList(player);
            }
        }
        
        /// <summary>
        /// Adds a player to the lobby player list.
        /// </summary>
        private void AddPlayerToList(PlayerRef player, NetworkObject playerObject)
        {
            // Create player list item
            GameObject playerItem = Instantiate(playerListItemPrefab, playerListContent);
            
            // Set player name
            TextMeshProUGUI playerNameText = playerItem.GetComponentInChildren<TextMeshProUGUI>();
            if (playerNameText != null)
            {
                playerNameText.text = $"Player {player.PlayerId}";
                
                // Highlight local player
                if (playerObject.HasInputAuthority)
                {
                    playerNameText.text += " (You)";
                    playerNameText.color = Color.green;
                }
            }
            
            // Store reference to player list item
            _playerListItems[player] = playerItem;
        }
        
        /// <summary>
        /// Removes a player from the lobby player list.
        /// </summary>
        private void RemovePlayerFromList(PlayerRef player)
        {
            // Find and destroy player list item
            if (_playerListItems.TryGetValue(player, out GameObject playerItem))
            {
                Destroy(playerItem);
                _playerListItems.Remove(player);
            }
        }
        
        /// <summary>
        /// Clears the lobby player list.
        /// </summary>
        private void ClearPlayerList()
        {
            // Destroy all player list items
            foreach (GameObject playerItem in _playerListItems.Values)
            {
                Destroy(playerItem);
            }
            
            _playerListItems.Clear();
        }
        
        #endregion
        
        #region HUD Updates
        
        /// <summary>
        /// Updates the health bar display.
        /// </summary>
        /// <param name="currentHealth">The current health value.</param>
        /// <param name="maxHealth">The maximum health value.</param>
        public void UpdateHealthBar(float currentHealth, float maxHealth)
        {
            healthBar.value = currentHealth / maxHealth;
        }
        
        /// <summary>
        /// Updates the timer display.
        /// </summary>
        private void UpdateTimerDisplay()
        {
            int minutes = Mathf.FloorToInt(_gameTimer / 60f);
            int seconds = Mathf.FloorToInt(_gameTimer % 60f);
            timerText.text = string.Format("{0:00}:{1:00}", minutes, seconds);
        }
        
        /// <summary>
        /// Updates the objective text.
        /// </summary>
        /// <param name="text">The new objective text.</param>
        public void UpdateObjectiveText(string text)
        {
            objectiveText.text = text;
        }
        
        /// <summary>
        /// Toggles the inventory panel.
        /// </summary>
        public void ToggleInventory()
        {
            inventoryPanel.SetActive(!inventoryPanel.activeSelf);
            
            // Pause/unpause game when inventory is open
            Time.timeScale = inventoryPanel.activeSelf ? 0f : 1f;
            
            // Show/hide cursor
            Cursor.lockState = inventoryPanel.activeSelf ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = inventoryPanel.activeSelf;
        }
        
        /// <summary>
        /// Updates the inventory display.
        /// </summary>
        /// <param name="items">The list of items to display.</param>
        public void UpdateInventory(List<InventoryItem> items)
        {
            // Clear existing items
            foreach (Transform child in inventoryContent)
            {
                Destroy(child.gameObject);
            }
            
            // Add new items
            foreach (InventoryItem item in items)
            {
                GameObject itemObject = Instantiate(inventoryItemPrefab, inventoryContent);
                
                // Set item name
                TextMeshProUGUI itemNameText = itemObject.GetComponentInChildren<TextMeshProUGUI>();
                if (itemNameText != null)
                {
                    itemNameText.text = item.Name;
                }
                
                // Set item icon
                Image itemIcon = itemObject.GetComponentInChildren<Image>();
                if (itemIcon != null && item.Icon != null)
                {
                    itemIcon.sprite = item.Icon;
                }
                
                // Set item button click handler
                Button itemButton = itemObject.GetComponent<Button>();
                if (itemButton != null)
                {
                    itemButton.onClick.AddListener(() => OnItemClicked(item));
                }
            }
        }
        
        /// <summary>
        /// Called when an inventory item is clicked.
        /// </summary>
        private void OnItemClicked(InventoryItem item)
        {
            // Use the item
            Debug.Log($"Item clicked: {item.Name}");
            
            // In a real game, you would call a method on the player to use the item
            // PlayerController.Local.UseItem(item);
        }
        
        #endregion
    }
    
    /// <summary>
    /// Represents an item in the player's inventory.
    /// </summary>
    [System.Serializable]
    public class InventoryItem
    {
        public string Name;
        public string Description;
        public Sprite Icon;
        public ItemType Type;
        
        public enum ItemType
        {
            Weapon,
            Tool,
            Resource,
            Consumable
        }
    }
} 