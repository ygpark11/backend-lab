/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                ps: {
                    black: '#121212', // 메인 배경 (짙은 회색)
                    card: '#202020',  // 카드 배경
                    blue: '#0070D1',  // 플레이스테이션 블루
                    hover: '#2f2f2f', // 호버 효과
                    text: '#eeeeee',  // 기본 텍스트
                    muted: '#b3b3b3'  // 보조 텍스트
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}