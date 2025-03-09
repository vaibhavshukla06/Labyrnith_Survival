using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using LabyrinthSurvival.Networking;
using LabyrinthSurvival.Procedural;
using LabyrinthSurvival.UI;

namespace LabyrinthSurvival.Core
{
    /// <summary>
    /// Sets up the initial game scene with all necessary components.
    /// </summary>
    public class SceneSetup : MonoBehaviour
    {
        [Header("Prefabs")]
        [SerializeField] private GameObject networkManagerPrefab;
        [SerializeField] private GameObject gameManagerPrefab;
        [SerializeField] private GameObject mazeGeneratorPrefab;
        [SerializeField] private GameObject uiManagerPrefab;
        
        [Header("Scene Settings")]
        [SerializeField] private bool isMainMenu = false;
        [SerializeField] private bool autoInitialize = true;
        
        private void Awake()
        {
            if (autoInitialize)
            {
                InitializeScene();
            }
        }
        
        /// <summary>
        /// Initializes the scene with all necessary components.
        /// </summary>
        public void InitializeScene()
        {
            // Create NetworkManager if it doesn't exist
            if (NetworkManager.Instance == null && networkManagerPrefab != null)
            {
                Instantiate(networkManagerPrefab);
            }
            
            // Create UIManager if it doesn't exist
            if (UIManager.Instance == null && uiManagerPrefab != null)
            {
                Instantiate(uiManagerPrefab);
            }
            
            // If this is not the main menu, create game-specific managers
            if (!isMainMenu)
            {
                // Create MazeGenerator if it doesn't exist
                if (FindObjectOfType<MazeGenerator>() == null && mazeGeneratorPrefab != null)
                {
                    Instantiate(mazeGeneratorPrefab);
                }
                
                // Create GameManager if it doesn't exist
                if (FindObjectOfType<GameManager>() == null && gameManagerPrefab != null)
                {
                    Instantiate(gameManagerPrefab);
                }
            }
        }
    }
} 