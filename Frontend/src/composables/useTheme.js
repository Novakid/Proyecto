import { computed, ref } from 'vue';

const STORAGE_KEY = 'app-theme';
const theme = ref('light');

const applyTheme = (value) => {
  const normalized = value === 'dark' ? 'dark' : 'light';
  theme.value = normalized;
  document.documentElement.dataset.theme = normalized;
  document.documentElement.style.colorScheme = normalized;
  return normalized;
};

export const loadSavedTheme = () => applyTheme(localStorage.getItem(STORAGE_KEY));

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark');
  const setTheme = (value) => {
    const normalized = applyTheme(value);
    localStorage.setItem(STORAGE_KEY, normalized);
  };
  const toggleTheme = () => setTheme(isDark.value ? 'light' : 'dark');
  return { theme, isDark, setTheme, toggleTheme };
}
