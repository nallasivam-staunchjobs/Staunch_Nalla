import React from 'react';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend
);

// Common chart options
const commonOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#6B7280',
        font: {
          family: 'Inter, sans-serif',
          size: 14,
        },
        padding: 20,
      },
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#6B7280',
      },
    },
    y: {
      grid: {
        color: '#E5E7EB',
      },
      ticks: {
        color: '#6B7280',
      },
    },
  },
};

// Bar Chart Component
export function BarChart({ data, options = {}, title = "Bar Chart", className = "" }) {
  const defaultData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Revenue',
        data: [12000, 19000, 3000, 5000, 2000, 3000],
        backgroundColor: 'rgba(79, 70, 229, 0.7)',
        borderColor: 'rgba(79, 70, 229, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Expenses',
        data: [8000, 12000, 4000, 3000, 1500, 4000],
        backgroundColor: 'rgba(220, 38, 38, 0.7)',
        borderColor: 'rgba(220, 38, 38, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    ...commonOptions,
    ...options,
    plugins: {
      ...commonOptions.plugins,
      ...options.plugins,
      title: {
        display: true,
        text: title,
        color: '#111827',
        font: {
          family: 'Inter, sans-serif',
          size: 18,
          weight: 'bold',
        },
      },
    },
    scales: {
      ...commonOptions.scales,
      y: {
        ...commonOptions.scales.y,
        ticks: {
          ...commonOptions.scales.y.ticks,
          callback: (value) => `$${value.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      <Bar data={data || defaultData} options={chartOptions} />
    </div>
  );
}

// Line Chart Component
export function LineChart({ data, options = {}, title = "Line Chart", className = "" }) {
  const defaultData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Users',
        data: [100, 150, 200, 180, 250, 300],
        borderColor: 'rgba(79, 70, 229, 1)',
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'rgba(79, 70, 229, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Sessions',
        data: [80, 120, 150, 140, 200, 240],
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'rgba(16, 185, 129, 1)',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    ...commonOptions,
    ...options,
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <Line data={data || defaultData} options={chartOptions} />
    </div>
  );
}

// Pie Chart Component
export function PieChart({ data, options = {}, title = "Pie Chart", className = "" }) {
  const defaultData = {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [
      {
        label: '# of Visitors',
        data: [60, 30, 10],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#6B7280',
          font: {
            family: 'Inter, sans-serif',
          },
        },
      },
      ...options.plugins,
    },
    ...options,
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <Pie data={data || defaultData} options={chartOptions} />
    </div>
  );
}

// Donut Chart Component
export function DonutChart({ data, options = {}, title = "Donut Chart", className = "" }) {
  const defaultData = {
    labels: ['Active', 'Inactive', 'Pending'],
    datasets: [
      {
        label: 'Status',
        data: [45, 25, 30],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(251, 191, 36, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(251, 191, 36, 1)',
        ],
        borderWidth: 2,
        cutout: '60%',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#6B7280',
          font: {
            family: 'Inter, sans-serif',
          },
          padding: 20,
        },
      },
      ...options.plugins,
    },
    ...options,
  };

  return (
    <div className={`bg-white p-6 rounded-lg shadow-md ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <Doughnut data={data || defaultData} options={chartOptions} />
    </div>
  );
}
