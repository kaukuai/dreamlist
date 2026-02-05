import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // 這一行是關鍵：幫你騙過瀏覽器，讓它以為 process 存在，避免白屏當機
    'process.env': {}
  }
})
