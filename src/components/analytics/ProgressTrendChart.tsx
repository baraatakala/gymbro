import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface ProgressTrendChartProps {
  labels: string[]
  values: number[]
  datasetLabel: string
}

export default function ProgressTrendChart({
  labels,
  values,
  datasetLabel,
}: ProgressTrendChartProps) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: datasetLabel,
            data: values,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            tension: 0.3,
            fill: true,
          },
        ],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', maxRotation: 45 }, grid: { color: '#334155' } },
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8' },
            grid: { color: '#334155' },
          },
        },
      }}
    />
  )
}
