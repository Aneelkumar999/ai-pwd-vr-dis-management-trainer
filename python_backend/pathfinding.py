import heapq

class Pathfinding:
    def __init__(self, grid_size=20):
        self.grid_size = grid_size
        self.obstacles = set()
        
    def add_obstacle(self, x, y):
        self.obstacles.add((round(x), round(y)))
        
    def find_path(self, start, goal):
        # start and goal are tuples (x, y)
        start = (round(start[0]), round(start[1]))
        goal = (round(goal[0]), round(goal[1]))
        
        open_set = []
        heapq.heappush(open_set, (0, start))
        
        came_from = {}
        g_score = {start: 0}
        f_score = {start: self.heuristic(start, goal)}
        
        while open_set:
            current = heapq.heappop(open_set)[1]
            
            if current == goal:
                return self.reconstruct_path(came_from, current)
                
            for neighbor in self.get_neighbors(current):
                tentative_g_score = g_score[current] + 1
                
                if tentative_g_score < g_score.get(neighbor, float('inf')):
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g_score
                    f_score[neighbor] = tentative_g_score + self.heuristic(neighbor, goal)
                    if neighbor not in [i[1] for i in open_set]:
                        heapq.heappush(open_set, (f_score[neighbor], neighbor))
                        
        return [] # No path
    
    def heuristic(self, a, b):
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
        
    def get_neighbors(self, node):
        x, y = node
        candidates = [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]
        valid_neighbors = []
        for nx, ny in candidates:
            if -self.grid_size <= nx <= self.grid_size and -self.grid_size <= ny <= self.grid_size:
                if (nx, ny) not in self.obstacles:
                    valid_neighbors.append((nx, ny))
        return valid_neighbors
        
    def reconstruct_path(self, came_from, current):
        total_path = [current]
        while current in came_from:
            current = came_from[current]
            total_path.append(current)
        return total_path[::-1]
