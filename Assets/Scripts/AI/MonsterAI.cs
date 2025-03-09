using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI;
using Fusion;
using LabyrinthSurvival.Player;

namespace LabyrinthSurvival.AI
{
    /// <summary>
    /// Controls the AI behavior for monsters in the maze.
    /// Uses a state machine to determine behavior and NavMesh for pathfinding.
    /// </summary>
    [RequireComponent(typeof(NavMeshAgent))]
    [RequireComponent(typeof(NetworkObject))]
    public class MonsterAI : NetworkBehaviour
    {
        [Header("AI Settings")]
        [SerializeField] private float detectionRadius = 10f;
        [SerializeField] private float attackRange = 1.5f;
        [SerializeField] private float patrolSpeed = 2f;
        [SerializeField] private float chaseSpeed = 4f;
        [SerializeField] private float attackCooldown = 2f;
        [SerializeField] private int attackDamage = 10;
        
        [Header("Patrol Settings")]
        [SerializeField] private float patrolWaitTime = 3f;
        [SerializeField] private float patrolRadius = 15f;
        
        [Header("Audio")]
        [SerializeField] private AudioClip idleSound;
        [SerializeField] private AudioClip chaseSound;
        [SerializeField] private AudioClip attackSound;
        
        // Components
        private NavMeshAgent _navMeshAgent;
        private Animator _animator;
        private AudioSource _audioSource;
        
        // State machine
        private enum AIState { Idle, Patrol, Chase, Attack }
        [Networked] private AIState _currentState { get; set; }
        
        // Target tracking
        [Networked] private NetworkBehaviourId _targetId { get; set; }
        private PlayerController _currentTarget;
        
        // Timers
        private float _stateTimer;
        private float _attackTimer;
        
        // Patrol variables
        private Vector3 _patrolDestination;
        
        // Network properties
        [Networked] private Vector3 _networkDestination { get; set; }
        
        public override void Spawned()
        {
            base.Spawned();
            
            // Get components
            _navMeshAgent = GetComponent<NavMeshAgent>();
            _animator = GetComponentInChildren<Animator>();
            _audioSource = GetComponent<AudioSource>();
            
            // Initialize state
            _currentState = AIState.Idle;
            _stateTimer = Random.Range(1f, 3f);
            _attackTimer = 0f;
            
            // Set initial NavMesh settings
            _navMeshAgent.speed = patrolSpeed;
            _navMeshAgent.stoppingDistance = 0.5f;
        }
        
        public override void FixedUpdateNetwork()
        {
            // Only run AI on the server
            if (!Object.HasStateAuthority)
                return;
            
            // Update timers
            _stateTimer -= Runner.DeltaTime;
            _attackTimer -= Runner.DeltaTime;
            
            // Update target reference
            UpdateTargetReference();
            
            // State machine
            switch (_currentState)
            {
                case AIState.Idle:
                    UpdateIdleState();
                    break;
                case AIState.Patrol:
                    UpdatePatrolState();
                    break;
                case AIState.Chase:
                    UpdateChaseState();
                    break;
                case AIState.Attack:
                    UpdateAttackState();
                    break;
            }
            
            // Store current destination for network synchronization
            _networkDestination = _navMeshAgent.destination;
        }
        
        public override void Render()
        {
            // Update animations based on state and speed
            if (_animator != null)
            {
                _animator.SetInteger("State", (int)_currentState);
                _animator.SetFloat("Speed", _navMeshAgent.velocity.magnitude);
            }
            
            // Sync destination on non-authority clients
            if (!Object.HasStateAuthority && _navMeshAgent != null)
            {
                _navMeshAgent.destination = _networkDestination;
            }
        }
        
        #region State Machine Methods
        
        private void UpdateIdleState()
        {
            // Play idle sound occasionally
            if (_audioSource != null && !_audioSource.isPlaying && Random.value < 0.01f)
            {
                _audioSource.clip = idleSound;
                _audioSource.Play();
            }
            
            // Look for targets
            PlayerController target = FindNearestTarget();
            if (target != null)
            {
                // Found a target, switch to chase state
                _currentTarget = target;
                _targetId = target.Id;
                ChangeState(AIState.Chase);
                return;
            }
            
            // Transition to patrol state after timer expires
            if (_stateTimer <= 0)
            {
                ChangeState(AIState.Patrol);
            }
        }
        
        private void UpdatePatrolState()
        {
            // Check if we've reached the destination or don't have one
            if (!_navMeshAgent.hasPath || _navMeshAgent.remainingDistance < 0.5f)
            {
                // Wait at the patrol point
                if (_stateTimer <= 0)
                {
                    // Find a new patrol point
                    FindPatrolDestination();
                    _stateTimer = patrolWaitTime;
                }
            }
            
            // Look for targets
            PlayerController target = FindNearestTarget();
            if (target != null)
            {
                // Found a target, switch to chase state
                _currentTarget = target;
                _targetId = target.Id;
                ChangeState(AIState.Chase);
            }
        }
        
        private void UpdateChaseState()
        {
            // If we don't have a target, go back to idle
            if (_currentTarget == null)
            {
                ChangeState(AIState.Idle);
                return;
            }
            
            // Update destination to target position
            _navMeshAgent.destination = _currentTarget.transform.position;
            
            // Play chase sound occasionally
            if (_audioSource != null && !_audioSource.isPlaying)
            {
                _audioSource.clip = chaseSound;
                _audioSource.Play();
            }
            
            // Check if we're close enough to attack
            float distanceToTarget = Vector3.Distance(transform.position, _currentTarget.transform.position);
            if (distanceToTarget <= attackRange)
            {
                ChangeState(AIState.Attack);
            }
            
            // If target is too far away, go back to patrol
            if (distanceToTarget > detectionRadius * 1.5f)
            {
                ChangeState(AIState.Patrol);
            }
        }
        
        private void UpdateAttackState()
        {
            // If we don't have a target, go back to idle
            if (_currentTarget == null)
            {
                ChangeState(AIState.Idle);
                return;
            }
            
            // Face the target
            Vector3 direction = (_currentTarget.transform.position - transform.position).normalized;
            Quaternion lookRotation = Quaternion.LookRotation(new Vector3(direction.x, 0, direction.z));
            transform.rotation = Quaternion.Slerp(transform.rotation, lookRotation, Time.deltaTime * 5f);
            
            // Attack if cooldown has expired
            if (_attackTimer <= 0)
            {
                // Perform attack
                Attack(_currentTarget);
                _attackTimer = attackCooldown;
                
                // Play attack sound
                if (_audioSource != null)
                {
                    _audioSource.clip = attackSound;
                    _audioSource.Play();
                }
            }
            
            // Check if target is still in range
            float distanceToTarget = Vector3.Distance(transform.position, _currentTarget.transform.position);
            if (distanceToTarget > attackRange)
            {
                ChangeState(AIState.Chase);
            }
        }
        
        #endregion
        
        #region Helper Methods
        
        private void ChangeState(AIState newState)
        {
            // Exit current state
            switch (_currentState)
            {
                case AIState.Idle:
                    break;
                case AIState.Patrol:
                    break;
                case AIState.Chase:
                    _navMeshAgent.speed = patrolSpeed;
                    break;
                case AIState.Attack:
                    break;
            }
            
            // Enter new state
            switch (newState)
            {
                case AIState.Idle:
                    _navMeshAgent.isStopped = true;
                    _stateTimer = Random.Range(2f, 5f);
                    break;
                case AIState.Patrol:
                    _navMeshAgent.isStopped = false;
                    _navMeshAgent.speed = patrolSpeed;
                    FindPatrolDestination();
                    break;
                case AIState.Chase:
                    _navMeshAgent.isStopped = false;
                    _navMeshAgent.speed = chaseSpeed;
                    break;
                case AIState.Attack:
                    _navMeshAgent.isStopped = true;
                    _attackTimer = 0.5f; // Small delay before first attack
                    break;
            }
            
            // Set new state
            _currentState = newState;
        }
        
        private void FindPatrolDestination()
        {
            // Find a random point on the NavMesh within patrol radius
            Vector3 randomDirection = Random.insideUnitSphere * patrolRadius;
            randomDirection += transform.position;
            
            NavMeshHit hit;
            if (NavMesh.SamplePosition(randomDirection, out hit, patrolRadius, NavMesh.AllAreas))
            {
                _patrolDestination = hit.position;
                _navMeshAgent.destination = _patrolDestination;
            }
        }
        
        private PlayerController FindNearestTarget()
        {
            // Find all players in detection radius
            Collider[] colliders = Physics.OverlapSphere(transform.position, detectionRadius);
            
            PlayerController nearestTarget = null;
            float nearestDistance = float.MaxValue;
            
            foreach (Collider collider in colliders)
            {
                PlayerController player = collider.GetComponent<PlayerController>();
                if (player != null)
                {
                    float distance = Vector3.Distance(transform.position, player.transform.position);
                    if (distance < nearestDistance)
                    {
                        // Check if there's a clear line of sight
                        if (HasLineOfSight(player.transform))
                        {
                            nearestTarget = player;
                            nearestDistance = distance;
                        }
                    }
                }
            }
            
            return nearestTarget;
        }
        
        private bool HasLineOfSight(Transform target)
        {
            // Check if there's a clear line of sight to the target
            Vector3 directionToTarget = (target.position - transform.position).normalized;
            float distanceToTarget = Vector3.Distance(transform.position, target.position);
            
            // Raycast to check for obstacles
            if (Physics.Raycast(transform.position + Vector3.up, directionToTarget, out RaycastHit hit, distanceToTarget))
            {
                // Check if the hit object is the target
                if (hit.transform == target)
                {
                    return true;
                }
            }
            
            return false;
        }
        
        private void Attack(PlayerController target)
        {
            // Perform attack logic
            // In a real game, you would call a method on the player to apply damage
            // For now, we'll just log the attack
            Debug.Log($"Monster attacked player for {attackDamage} damage");
            
            // Example of how you might apply damage in a networked game
            if (target.Object.HasStateAuthority)
            {
                // If we have authority over the target, apply damage directly
                // target.TakeDamage(attackDamage);
            }
            else
            {
                // Otherwise, we need to use an RPC or similar to request damage application
                // RPC_RequestDamage(target.Id, attackDamage);
            }
        }
        
        private void UpdateTargetReference()
        {
            // If we have a target ID but no reference, try to find the reference
            if (_targetId.IsValid && _currentTarget == null)
            {
                foreach (var player in Runner.ActivePlayers)
                {
                    PlayerController playerController = Runner.GetPlayerObject(player)?.GetComponent<PlayerController>();
                    if (playerController != null && playerController.Id == _targetId)
                    {
                        _currentTarget = playerController;
                        break;
                    }
                }
                
                // If we still couldn't find the target, clear the target ID
                if (_currentTarget == null)
                {
                    _targetId = default;
                }
            }
        }
        
        #endregion
    }
} 