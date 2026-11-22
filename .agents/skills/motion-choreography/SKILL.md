---
name: motion-choreography
description: Choreographed motion systems using spring physics, velocity lerping, and staggered narrative reveals.
---

# Motion Choreography Standards

## 1. Physics over Mechanical Timers
1. **Spring Mechanics**:
   - Use physical properties: Mass, Tension/Stiffness, Friction/Damping.
   - Natural resting curves allow elements to settle with organic inertia rather than abrupt linear CSS stops.
2. **Velocity Transfer**:
   - When the user releases a timeline scrubber or drag handle, transfer pointer velocity to the momentum animation.
3. **Staggered Orchestration**:
   - Sequence entrances with a 40ms-80ms delay between narrative layers (Atmosphere Canvas -> Headline -> Metric -> Micro-data).
4. **Interactive Cohesion**:
   - Ensure all animated elements share the same physics constants so the interface feels like one cohesive physical universe.
