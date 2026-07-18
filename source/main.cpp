#include <vector>
#include <iostream>
#include <algorithm>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

struct Step {
    int row;
    int col;
    int type; // 0 for VISIT/EXPLORE, 1 for BACKTRACK/DEAD-END
};

struct Point {
    int row;
    int col;
};

// Global maze state variables
int maze_width = 0;
int maze_height = 0;
std::vector<int> maze_grid; // 0 = empty/path, 1 = wall
std::vector<Step> solve_events;
std::vector<Point> final_path;
std::vector<bool> visited;

extern "C" {

EMSCRIPTEN_KEEPALIVE
void init_maze(int width, int height) {
    maze_width = width;
    maze_height = height;
    maze_grid.assign(width * height, 0);
    solve_events.clear();
    final_path.clear();
    visited.clear();
}

EMSCRIPTEN_KEEPALIVE
void set_wall(int row, int col, int is_wall) {
    if (row >= 0 && row < maze_height && col >= 0 && col < maze_width) {
        maze_grid[row * maze_width + col] = is_wall;
    }
}

// Internal recursive solver
bool solve_recursive(int r, int c, int goal_r, int goal_c) {
    // 1. Boundary check
    if (r < 0 || r >= maze_height || c < 0 || c >= maze_width) {
        return false;
    }

    // 2. Wall check or visited check
    int idx = r * maze_width + c;
    if (maze_grid[idx] == 1 || visited[idx]) {
        return false;
    }

    // 3. Mark cell as visited
    visited[idx] = true;

    // 4. Log the step as EXPLORING
    solve_events.push_back({r, c, 0});

    // 5. Goal check
    if (r == goal_r && c == goal_c) {
        final_path.push_back({r, c});
        return true;
    }

    // 6. Explore neighbors in typical order: Up, Right, Down, Left
    int dRow[] = {-1, 0, 1, 0};
    int dCol[] = {0, 1, 0, -1};

    for (int i = 0; i < 4; ++i) {
        int next_r = r + dRow[i];
        int next_c = c + dCol[i];
        if (solve_recursive(next_r, next_c, goal_r, goal_c)) {
            final_path.push_back({r, c});
            return true;
        }
    }

    // 7. Backtrack: Log step as BACKTRACK/DEAD-END
    solve_events.push_back({r, c, 1});

    // Note: We leave visited[idx] = true. This prevents the solver from wasting steps 
    // re-visiting this known dead-end cell through different paths, which mirrors 
    // optimal pathfinding behavior in robotic navigation.
    return false;
}

EMSCRIPTEN_KEEPALIVE
int solve_maze(int start_row, int start_col, int goal_row, int goal_col) {
    solve_events.clear();
    final_path.clear();
    visited.assign(maze_width * maze_height, false);

    bool found = solve_recursive(start_row, start_col, goal_row, goal_col);
    if (found) {
        // Reverse final_path because recursive call constructs it from goal to start
        std::reverse(final_path.begin(), final_path.end());
        return 1; // Path found
    }
    return 0; // No path found
}

EMSCRIPTEN_KEEPALIVE
int get_event_count() {
    return solve_events.size();
}

EMSCRIPTEN_KEEPALIVE
int get_event_row(int index) {
    if (index >= 0 && index < (int)solve_events.size()) {
        return solve_events[index].row;
    }
    return -1;
}

EMSCRIPTEN_KEEPALIVE
int get_event_col(int index) {
    if (index >= 0 && index < (int)solve_events.size()) {
        return solve_events[index].col;
    }
    return -1;
}

EMSCRIPTEN_KEEPALIVE
int get_event_type(int index) {
    if (index >= 0 && index < (int)solve_events.size()) {
        return solve_events[index].type;
    }
    return -1;
}

EMSCRIPTEN_KEEPALIVE
int get_path_length() {
    return final_path.size();
}

EMSCRIPTEN_KEEPALIVE
int get_path_row(int index) {
    if (index >= 0 && index < (int)final_path.size()) {
        return final_path[index].row;
    }
    return -1;
}

EMSCRIPTEN_KEEPALIVE
int get_path_col(int index) {
    if (index >= 0 && index < (int)final_path.size()) {
        return final_path[index].col;
    }
    return -1;
}

} // extern "C"
