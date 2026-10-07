export interface TripRequest {
  raw_query: string
  destination: string
  origin: string
  duration_days: number
  travel_month: string
  num_travelers: number
  budget_inr: number
  interests: string[]
  avoid: string[]
}

export interface FlightInfo {
  recommended_routes: string[]
  estimated_cost_inr: number
  airlines: string[]
  tips: string[]
}

export interface HotelRecommendation {
  name: string
  location: string
  price_per_night_inr: number
  rating: string
  type: string
  why: string
  booking_link?: string
}

export interface HotelInfo {
  recommendations: HotelRecommendation[]
  estimated_total_cost_inr: number
  tips: string[]
}

export interface WeatherInfo {
  summary: string
  monthly_overview: string
  daily_forecast: string[]
  rain_probability: string
  packing_tips: string[]
}

export interface RestaurantRecommendation {
  name: string
  location: string
  cuisine: string
  price_range: string
  price_per_meal_inr: number
  specialty: string
  why: string
  maps_link?: string
}

export interface FoodInfo {
  must_try_dishes: string[]
  restaurant_recommendations: RestaurantRecommendation[]
  estimated_daily_food_cost_inr: number
  food_tips: string[]
}

export type ActivityType = 'DINING' | 'SHOPPING' | 'EXPLORING' | 'TRANSIT' | 'SIGHTSEEING' | 'RELAXING' | 'NIGHTLIFE' | 'CULTURE' | 'NATURE' | 'ADVENTURE' | 'ENTERTAINMENT' | 'WELLNESS' | 'ACCOMMODATION'

export interface TouristAttraction {
  name: string
  maps_link?: string
}

export interface ItineraryDay {
  day: number
  date_note: string
  city: string
  morning: string
  morning_type?: ActivityType
  afternoon: string
  afternoon_type?: ActivityType
  evening: string
  evening_type?: ActivityType
  estimated_cost_inr: number
  highlights: TouristAttraction[]
}

export interface ItineraryInfo {
  days: ItineraryDay[]
  rain_alternative_plan: string
  general_tips: string[]
}

export interface TransportLeg {
  from: string
  to: string
  mode: string
  duration: string
  cost_inr: number
  booking_tip: string
}

export interface RouteInfo {
  optimal_city_order: string[]
  transport_between_cities: TransportLeg[]
  local_transport_tips: string[]
  google_maps_link: string
}

export interface BudgetInfo {
  total_budget_inr: number
  breakdown: Record<string, number>
  per_person_per_day_inr: number
  savings_tips: string[]
  is_feasible: boolean
  feasibility_note: string
}

export interface CurrencyInfo {
  inr_to_jpy_rate?: number
  budget_in_jpy?: number
  daily_budget_jpy?: number
  dest_currency_code?: string
  inr_to_dest_rate?: number
  budget_in_dest_currency?: number
  daily_budget_dest_currency?: number
  useful_conversions: Record<string, string>
  payment_tips: string[]
}

export interface VisaInfo {
  visa_required: boolean
  visa_type: string
  application_steps: string[]
  required_documents: string[]
  processing_time: string
  estimated_fee_inr: number
  embassy_link: string
}

export interface TripPlan {
  session_id: string
  request: TripRequest
  flights: FlightInfo
  hotels: HotelInfo
  weather: WeatherInfo
  food: FoodInfo
  itinerary: ItineraryInfo
  route: RouteInfo
  budget: BudgetInfo
  currency: CurrencyInfo
  visa: VisaInfo
  packing_list: string[]
  tourist_attractions: TouristAttraction[]
  errors: Record<string, string>
}

export interface PlanTripResponse {
  session_id: string
  status: string
  message: string
}

export interface GetPlanResponse {
  session_id: string
  status: 'pending' | 'running' | 'done' | 'error'
  phase?: number
  plan?: TripPlan
  error?: string
}
