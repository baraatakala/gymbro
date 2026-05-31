export interface PlanExercise {
  id: string
  name: string
  exerciseId: string | null
  sortOrder: number
}

export interface WorkoutDayPlan {
  id: string
  name: string
  sortOrder: number
  exercises: PlanExercise[]
}

export interface UserWorkoutPlan {
  days: WorkoutDayPlan[]
}
