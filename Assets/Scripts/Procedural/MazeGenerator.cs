using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using THREE;

namespace LabyrinthSurvival.Procedural
{
    /// <summary>
    /// Handles the procedural generation of the maze using a hybrid approach
    /// combining Prim's Algorithm and Wave Function Collapse.
    /// </summary>
    public class MazeGenerator : MonoBehaviour
    {
        [Header("Maze Settings")]
        [SerializeField] private int width = 20;
        [SerializeField] private int height = 20;
        [SerializeField] private float cellSize = 2f;
        [SerializeField] private float wallHeight = 3f;
        [SerializeField] private float shiftInterval = 60f; // Time in seconds between maze shifts
        
        [Header("Prefabs")]
        [SerializeField] private GameObject wallPrefab;
        [SerializeField] private GameObject floorPrefab;
        [SerializeField] private GameObject exitPrefab;
        
        [Header("Maze Shifting")]
        [SerializeField] private bool enableDynamicShifting = true;
        [SerializeField] private float shiftChance = 0.2f; // Chance of a wall shifting during a shift event
        [SerializeField] private float shiftDuration = 2f; // How long it takes for a wall to move
        
        // Maze representation: true = wall, false = path
        private bool[,] mazeGrid;
        private Transform mazeParent;
        private Dictionary<Vector2Int, GameObject> wallObjects = new Dictionary<Vector2Int, GameObject>();
        private Vector2Int exitPosition;
        private float nextShiftTime;
        
        // For Prim's algorithm
        private List<Vector2Int> frontiers = new List<Vector2Int>();
        
        // Directions: Up, Right, Down, Left
        private Vector2Int[] directions = new Vector2Int[]
        {
            new Vector2Int(0, 1),
            new Vector2Int(1, 0),
            new Vector2Int(0, -1),
            new Vector2Int(-1, 0)
        };
        
        private Scene scene;
        
        private void Start()
        {
            InitializeMaze();
            GenerateMaze();
            InstantiateMaze();
            
            if (enableDynamicShifting)
            {
                nextShiftTime = Time.time + shiftInterval;
            }
        }
        
        private void Update()
        {
            if (enableDynamicShifting && Time.time >= nextShiftTime)
            {
                StartCoroutine(ShiftMazeWalls());
                nextShiftTime = Time.time + shiftInterval;
            }
        }
        
        private void InitializeMaze()
        {
            // Create a parent object for all maze elements
            mazeParent = new GameObject("Maze").transform;
            mazeParent.SetParent(transform);
            
            // Initialize the grid with all walls
            mazeGrid = new bool[width, height];
            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    mazeGrid[x, y] = true; // Start with all walls
                }
            }
            
            scene = new Scene();
        }
        
        private void GenerateMaze()
        {
            // Prim's Algorithm for maze generation
            
            // Start with a random cell
            Vector2Int startCell = new Vector2Int(Random.Range(0, width), Random.Range(0, height));
            mazeGrid[startCell.x, startCell.y] = false; // Mark as path
            
            // Add all neighboring cells to the frontier
            AddFrontiers(startCell);
            
            // Continue until there are no more frontier cells
            while (frontiers.Count > 0)
            {
                // Pick a random frontier cell
                int randomIndex = Random.Range(0, frontiers.Count);
                Vector2Int currentCell = frontiers[randomIndex];
                frontiers.RemoveAt(randomIndex);
                
                // Find all neighboring cells that are already part of the maze
                List<Vector2Int> neighbors = GetNeighborsInMaze(currentCell);
                
                if (neighbors.Count > 0)
                {
                    // Connect the frontier cell to a random neighbor
                    Vector2Int neighbor = neighbors[Random.Range(0, neighbors.Count)];
                    mazeGrid[currentCell.x, currentCell.y] = false; // Mark frontier as path
                    
                    // Add new frontier cells
                    AddFrontiers(currentCell);
                }
            }
            
            // Create an exit
            CreateExit();
            
            // Apply Wave Function Collapse to add some organic variations
            ApplyWaveFunctionCollapse();
            
            // Instantiate the maze in Three.js
            InstantiateMaze();
        }
        
        private void AddFrontiers(Vector2Int cell)
        {
            foreach (Vector2Int dir in directions)
            {
                Vector2Int frontier = cell + dir * 2; // Two cells away to maintain walls between paths
                
                // Check if the frontier is within bounds and not already a path
                if (IsInBounds(frontier) && mazeGrid[frontier.x, frontier.y])
                {
                    frontiers.Add(frontier);
                    mazeGrid[frontier.x, frontier.y] = true; // Keep as wall for now
                }
            }
        }
        
        private List<Vector2Int> GetNeighborsInMaze(Vector2Int cell)
        {
            List<Vector2Int> neighbors = new List<Vector2Int>();
            
            foreach (Vector2Int dir in directions)
            {
                Vector2Int neighbor = cell + dir * 2; // Two cells away
                
                // Check if the neighbor is within bounds and already a path
                if (IsInBounds(neighbor) && !mazeGrid[neighbor.x, neighbor.y])
                {
                    neighbors.Add(neighbor);
                }
            }
            
            return neighbors;
        }
        
        private bool IsInBounds(Vector2Int cell)
        {
            return cell.x >= 0 && cell.x < width && cell.y >= 0 && cell.y < height;
        }
        
        private void CreateExit()
        {
            // Place exit at a random edge of the maze
            int side = Random.Range(0, 4);
            
            switch (side)
            {
                case 0: // Top
                    exitPosition = new Vector2Int(Random.Range(0, width), height - 1);
                    break;
                case 1: // Right
                    exitPosition = new Vector2Int(width - 1, Random.Range(0, height));
                    break;
                case 2: // Bottom
                    exitPosition = new Vector2Int(Random.Range(0, width), 0);
                    break;
                case 3: // Left
                    exitPosition = new Vector2Int(0, Random.Range(0, height));
                    break;
            }
            
            // Ensure the exit and path to it are clear
            mazeGrid[exitPosition.x, exitPosition.y] = false;
            
            // Create a path to the exit
            Vector2Int pathCell = exitPosition;
            if (exitPosition.x == 0) pathCell.x += 1;
            else if (exitPosition.x == width - 1) pathCell.x -= 1;
            else if (exitPosition.y == 0) pathCell.y += 1;
            else if (exitPosition.y == height - 1) pathCell.y -= 1;
            
            mazeGrid[pathCell.x, pathCell.y] = false;
        }
        
        private void ApplyWaveFunctionCollapse()
        {
            // Simplified Wave Function Collapse to add some organic variations
            // This is a very basic implementation that just adds some random variations
            
            for (int i = 0; i < width * height / 10; i++) // Modify about 10% of the maze
            {
                int x = Random.Range(1, width - 1);
                int y = Random.Range(1, height - 1);
                
                // Don't modify the exit or cells adjacent to it
                if (Vector2Int.Distance(new Vector2Int(x, y), exitPosition) < 3)
                    continue;
                
                // Count adjacent paths
                int adjacentPaths = 0;
                foreach (Vector2Int dir in directions)
                {
                    Vector2Int neighbor = new Vector2Int(x, y) + dir;
                    if (IsInBounds(neighbor) && !mazeGrid[neighbor.x, neighbor.y])
                    {
                        adjacentPaths++;
                    }
                }
                
                // Apply rules based on adjacent paths
                if (mazeGrid[x, y] && adjacentPaths >= 3)
                {
                    // If it's a wall with 3+ adjacent paths, make it a path
                    mazeGrid[x, y] = false;
                }
                else if (!mazeGrid[x, y] && adjacentPaths <= 1)
                {
                    // If it's a path with 0-1 adjacent paths, make it a wall
                    // But ensure we don't create dead ends
                    bool createDeadEnd = true;
                    foreach (Vector2Int dir in directions)
                    {
                        Vector2Int neighbor = new Vector2Int(x, y) + dir;
                        if (IsInBounds(neighbor) && !mazeGrid[neighbor.x, neighbor.y])
                        {
                            // Check if this neighbor has other paths
                            int neighborPaths = 0;
                            foreach (Vector2Int nDir in directions)
                            {
                                Vector2Int nNeighbor = neighbor + nDir;
                                if (IsInBounds(nNeighbor) && !mazeGrid[nNeighbor.x, nNeighbor.y] && 
                                    (nNeighbor.x != x || nNeighbor.y != y))
                                {
                                    neighborPaths++;
                                }
                            }
                            
                            if (neighborPaths == 0)
                            {
                                createDeadEnd = false;
                                break;
                            }
                        }
                    }
                    
                    if (createDeadEnd)
                    {
                        mazeGrid[x, y] = true;
                    }
                }
            }
            
            // Ensure the maze is still solvable by checking connectivity
            EnsureMazeIsSolvable();
        }
        
        private void EnsureMazeIsSolvable()
        {
            // Find a starting point (any path cell that's not the exit)
            Vector2Int start = Vector2Int.zero;
            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    if (!mazeGrid[x, y] && (x != exitPosition.x || y != exitPosition.y))
                    {
                        start = new Vector2Int(x, y);
                        break;
                    }
                }
                if (start != Vector2Int.zero) break;
            }
            
            // Use BFS to check if there's a path from start to exit
            bool[,] visited = new bool[width, height];
            Queue<Vector2Int> queue = new Queue<Vector2Int>();
            
            queue.Enqueue(start);
            visited[start.x, start.y] = true;
            
            bool foundExit = false;
            
            while (queue.Count > 0 && !foundExit)
            {
                Vector2Int current = queue.Dequeue();
                
                if (current.x == exitPosition.x && current.y == exitPosition.y)
                {
                    foundExit = true;
                    break;
                }
                
                foreach (Vector2Int dir in directions)
                {
                    Vector2Int next = current + dir;
                    
                    if (IsInBounds(next) && !mazeGrid[next.x, next.y] && !visited[next.x, next.y])
                    {
                        queue.Enqueue(next);
                        visited[next.x, next.y] = true;
                    }
                }
            }
            
            // If no path to exit, create one
            if (!foundExit)
            {
                Debug.Log("Maze was not solvable, creating path to exit...");
                
                // Simple approach: create a straight path from start to exit
                Vector2Int current = start;
                
                while (current != exitPosition)
                {
                    // Move towards exit
                    if (current.x < exitPosition.x) current.x++;
                    else if (current.x > exitPosition.x) current.x--;
                    else if (current.y < exitPosition.y) current.y++;
                    else if (current.y > exitPosition.y) current.y--;
                    
                    // Clear the path
                    mazeGrid[current.x, current.y] = false;
                }
            }
        }
        
        private void InstantiateMaze()
        {
            // Create floor
            GameObject floor = Instantiate(floorPrefab, mazeParent);
            floor.transform.localScale = new Vector3(width * cellSize, 0.1f, height * cellSize);
            floor.transform.position = new Vector3(width * cellSize / 2 - cellSize / 2, 0, height * cellSize / 2 - cellSize / 2);
            
            // Create walls
            for (int x = 0; x < width; x++)
            {
                for (int y = 0; y < height; y++)
                {
                    if (mazeGrid[x, y]) // If it's a wall
                    {
                        Vector3 position = new Vector3(x * cellSize, wallHeight / 2, y * cellSize);
                        GameObject wall = Instantiate(wallPrefab, position, Quaternion.identity, mazeParent);
                        wall.transform.localScale = new Vector3(cellSize, wallHeight, cellSize);
                        
                        // Store reference to the wall object
                        wallObjects[new Vector2Int(x, y)] = wall;
                    }
                }
            }
            
            // Create exit
            Vector3 exitPosition3D = new Vector3(exitPosition.x * cellSize, 0.1f, exitPosition.y * cellSize);
            Instantiate(exitPrefab, exitPosition3D, Quaternion.identity, mazeParent);
        }
        
        private IEnumerator ShiftMazeWalls()
        {
            List<Vector2Int> wallsToShift = new List<Vector2Int>();
            List<Vector2Int> newPositions = new List<Vector2Int>();
            
            // Determine which walls will shift and where they'll go
            foreach (var wallPos in wallObjects.Keys)
            {
                if (Random.value < shiftChance)
                {
                    // Don't shift walls near the exit
                    if (Vector2Int.Distance(wallPos, exitPosition) < 3)
                        continue;
                    
                    // Pick a random direction to shift
                    Vector2Int direction = directions[Random.Range(0, directions.Length)];
                    Vector2Int newPos = wallPos + direction;
                    
                    // Check if the new position is valid
                    if (IsInBounds(newPos) && !wallObjects.ContainsKey(newPos))
                    {
                        wallsToShift.Add(wallPos);
                        newPositions.Add(newPos);
                    }
                }
            }
            
            // Animate the wall shifts
            float startTime = Time.time;
            
            while (Time.time < startTime + shiftDuration)
            {
                float t = (Time.time - startTime) / shiftDuration;
                
                for (int i = 0; i < wallsToShift.Count; i++)
                {
                    Vector2Int oldPos = wallsToShift[i];
                    Vector2Int newPos = newPositions[i];
                    
                    if (wallObjects.TryGetValue(oldPos, out GameObject wall))
                    {
                        Vector3 startPos = new Vector3(oldPos.x * cellSize, wallHeight / 2, oldPos.y * cellSize);
                        Vector3 endPos = new Vector3(newPos.x * cellSize, wallHeight / 2, newPos.y * cellSize);
                        
                        wall.transform.position = Vector3.Lerp(startPos, endPos, t);
                    }
                }
                
                yield return null;
            }
            
            // Update the maze grid and wall objects dictionary
            for (int i = 0; i < wallsToShift.Count; i++)
            {
                Vector2Int oldPos = wallsToShift[i];
                Vector2Int newPos = newPositions[i];
                
                if (wallObjects.TryGetValue(oldPos, out GameObject wall))
                {
                    // Update the grid
                    mazeGrid[oldPos.x, oldPos.y] = false;
                    mazeGrid[newPos.x, newPos.y] = true;
                    
                    // Update the dictionary
                    wallObjects.Remove(oldPos);
                    wallObjects[newPos] = wall;
                    
                    // Ensure the wall is in the correct final position
                    wall.transform.position = new Vector3(newPos.x * cellSize, wallHeight / 2, newPos.y * cellSize);
                }
            }
            
            // Check if the maze is still solvable after shifting
            EnsureMazeIsSolvable();
        }
        
        // Public method to regenerate the maze
        public void RegenerateMaze()
        {
            // Clear existing maze
            foreach (Transform child in mazeParent)
            {
                Destroy(child.gameObject);
            }
            
            wallObjects.Clear();
            
            // Generate new maze
            InitializeMaze();
            GenerateMaze();
            InstantiateMaze();
        }
    }
} 