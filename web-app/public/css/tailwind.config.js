// needed to ensure the Tailwind CSS classes are generated correctly
// and not purged by Tailwind's default purge settings especially for dynamic classes

module.exports = {
  content: ['./src/**/*.{html,js}'],
  safelist: [
    'bg-orange-500',
    'text-orange-600',
    'text-orange-300',
    'bg-blue-500',
    'text-blue-600',
    'text-blue-300',
    'bg-green-500',
    'text-green-600',
    'text-green-300',
    'bg-yellow-500',
    'text-yellow-600',
    'text-yellow-300',
    'bg-red-500',
    'text-red-600',
    'text-red-300',
    'bg-amber-500',
    'text-amber-600',
    'text-amber-300',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
