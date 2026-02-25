import random

class SimulationEngine:
    def __init__(self):
        self.disaster_type = None
        self.severity = 0.0
        self.active_hazards = []

    def start_disaster(self, disaster_type):
        self.disaster_type = disaster_type
        self.severity = 10.0
        
        if disaster_type == 'fire' or disaster_type == 'earthquake':
            # Pick random buildings to affect
            targets = []
            count = 3 if disaster_type == 'earthquake' else 1 # Fire starts with 1, Quake with 3
            
            for _ in range(count): 
                tx = random.choice(range(-50, 50, 10))
                tz = random.choice(range(-50, 50, 10))
                # Structure starts on fire, then collapses
                targets.append({
                    "type": "structure_fire", 
                    "location": {"x": tx, "z": tz}, 
                    "timer": 10.0 if disaster_type == 'fire' else 5.0, # Fire burns longer
                    "state": "burning"
                })
            self.active_hazards = targets
            
        elif disaster_type == 'flood':
            self.active_hazards = [{"type": "flood", "water_level": 0.5}]
            
        return self.get_state()

    def update(self):
        if not self.disaster_type:
            return None
        
        # Simulate spread
        self.severity += 0.5
        
        if self.disaster_type in ['earthquake', 'fire']:
            # Progress buildings from fire to collapse
            for hazard in self.active_hazards:
                if hazard['type'] == 'structure_fire':
                    hazard['timer'] -= 0.1
                    # Spread fire?
                    if self.disaster_type == 'fire' and random.random() < 0.05:
                         # Logic to add new fire hazards could go here (omitted for simplicity)
                         pass

                    if hazard['timer'] <= 0:
                        hazard['type'] = 'collapse'
                        hazard['state'] = 'collapsed'

        elif self.disaster_type == 'flood':
            # Increase water level
            for hazard in self.active_hazards:
                if hazard['type'] == 'flood':
                    hazard['water_level'] += 0.05 # Water rises

        return self.get_state()

    def get_state(self):
        return {
            "disaster_type": self.disaster_type,
            "severity": self.severity,
            "hazards": self.active_hazards
        }

    def evaluate_decision(self, action):
        # AI Decision Tree Logic Stub
        score = 0
        feedback = ""

        if self.disaster_type == "fire":
            if action == "evacuate":
                score = 90
                feedback = "Good decision. Evacuation is priority."
            elif action == "wait":
                score = 10
                feedback = "Poor decision. Fire spreads quickly."
            else:
                score = 50
                feedback = "Neutral action."
        
        return {"score": score, "feedback": feedback}
