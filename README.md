# 🎚️ Video & Audio Manager v2.2 - Chrome Extension

[English](#english) | [Русский](#russian)

---

<a name="english"></a>

## English

[![Chrome Web Store Version](https://img.shields.io/chrome-web-store/v/efkidfgpglnlabaphedbiglpdaigfkpj?color=blue)](https://chrome.google.com/webstore/detail/video-audio-manager/efkidfgpglnlabaphedbiglpdaigfkpj)
[![GitHub license](https://img.shields.io/badge/license-GPL--3.0-blue)](https://github.com/ClearNetSky/Video-Audio-Manage-Real-Time-Video-and-Audio-Processing/blob/main/LICENSE)
![Manifest Version](https://img.shields.io/badge/manifest-v3-important)
![Version](https://img.shields.io/badge/version-2.2.0-brightgreen)

**Professional real-time video and audio processing for any website**  
*Created by Aristarh Ucolov*

### ✨ What's New in v2.2

- 🌐 **In-app language switcher** - EN/RU button right in the popup header, plus a language setting (Auto/English/Русский) in Advanced Settings
- ⏩ **Playback Speed control** - 0.25x to 3x with pitch preservation
- 🛡️ **Anti-clipping limiter** - Automatically engages during volume boost; boost extended to 300%
- 🎛️ **One-click preset cards** - Presets are now a grid of cards instead of a dropdown; custom presets deletable in place
- 🎯 **Smarter UX** - Per-tab reset buttons, double-click a value to reset it, dot indicators on tabs with active changes, dimmed UI when disabled

### ✨ What's New in v2.1

- 🎨 **Complete UI redesign** - Modern gradient accent, card layout, icon tabs, new equalizer
- 🔊 **Reverb, Delay & Reverse Stereo now work** - Real Web Audio implementation
- 🌡️ **Sharpness & Color Temperature now work** - Implemented via SVG filters, temperature slider added
- 🌒 **Vignette fixed** - Now renders correctly on top of the video
- 🌐 **Localization fixed** - Russian interface finally displays (MV3 CSP bug)
- ⌨️ **Real keyboard shortcuts** - Alt+Shift+V toggle, Alt+Shift+R reset (configurable)
- 🖼️ **Iframe support** - Embedded players are now processed
- 🔇 **Audio reliability** - Fixed sound disappearing due to suspended/closed AudioContext

### ✨ What's New in v2.0

- 🌐 **Multi-language support** - English and Russian interface
- 🎵 **10-Band Equalizer** - Professional audio frequency control
- 🎨 **Enhanced Video Effects** - Opacity, Vignette, Temperature controls
- 🔊 **Improved Audio Engine** - No more artifacts, crystal clear sound
- 🎭 **8 Built-in Presets** - Cinematic, Vintage, Night, Bass Boost, Voice Clarity, Warm, Cool, High Contrast
- 🎯 **Modern UI/UX** - Sleek animations and intuitive controls
- ⚡ **Performance Optimized** - Uses native Web Audio API nodes for better quality

### 🌟 Core Features

#### 🎬 Advanced Video Processing
- **Basic Controls**: Brightness (0-200%), Contrast (0-200%), Saturation (0-200%)
- **Color Adjustment**: Hue Rotation (-180° to +180°), Grayscale, Sepia
- **Image Quality**: Sharpness control, Blur effect (0-20px)
- **Visual Effects**: Invert Colors, Opacity, Vignette
- **Special Features**: Color Temperature adjustment

#### 🔊 Professional Audio Engine
- **Volume Control**: Boost up to 200% without distortion
- **10-Band Equalizer**: 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz
- **Bass Management**: ±20dB precise control
- **Stereo Tools**: Pan control, Channel Reverse (L↔R)
- **Audio Effects**: Reverb with adjustable level, Delay/Echo
- **High-Quality Processing**: Uses BiquadFilter and native audio nodes

#### 🎭 Preset System
**Built-in Presets:**
- **Cinematic** - Movie-theater experience
- **Vintage** - Warm retro look with sepia tones
- **Night Mode** - Reduced brightness for late-night viewing
- **Bass Boost** - Powerful low-end response
- **Voice Clarity** - Enhanced speech frequencies
- **Warm Tones** - Cozy atmosphere
- **Cool Tones** - Crisp, modern look
- **High Contrast** - Dramatic visual impact

### 🚀 Installation

#### From Chrome Web Store
[![Available in Chrome Web Store](https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/efkidfgpglnlabaphedbiglpdaigfkpj)

#### Manual Installation
```bash
1. Download or clone this repository
2. Open Chrome and navigate to chrome://extensions/
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension folder
```

### 🌐 Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Google Chrome | ✅ Yes |
| Microsoft Edge | ✅ Yes |
| Brave | ✅ Yes |
| Opera | ✅ Yes |
| Firefox | ❌ No |

### 📂 Project Structure

```
├── _locales/              # Internationalization
├── content/               # Content scripts
├── icons/                 # Extension icons
├── options/               # Settings page
├── popup/                 # Extension popup UI
├── shared/                # Shared utilities
├── background.js          # Service worker
└── manifest.json          # Extension manifest
```

### 💖 Support

If you enjoy using this extension, consider supporting development:

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Support-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/aristarh.ucolov)

---

<a name="russian"></a>

## Русский

**Профессиональная обработка видео и аудио в реальном времени**  
*Создано Аристархом Уколовым*

### ✨ Что нового в v2.2

- 🌐 **Переключатель языка в интерфейсе** - Кнопка EN/RU прямо в шапке попапа + настройка языка (Авто/English/Русский) в расширенных настройках
- ⏩ **Скорость воспроизведения** - От 0.25x до 3x с сохранением тона
- 🛡️ **Лимитер против искажений** - Автоматически включается при усилении громкости; буст расширен до 300%
- 🎛️ **Пресеты в один клик** - Сетка карточек вместо выпадающего списка; свои пресеты удаляются на месте
- 🎯 **Удобнее в мелочах** - Кнопки сброса на вкладках, двойной клик по значению сбрасывает его, точки-индикаторы активных изменений, затемнение при выключении

### ✨ Что нового в v2.1

- 🎨 **Полный редизайн интерфейса** - Современный градиентный акцент, карточки, вкладки с иконками
- 🔊 **Реверберация, эхо и реверс стерео теперь работают** - Реальная реализация на Web Audio API
- 🌡️ **Резкость и температура цвета теперь работают** - Реализованы через SVG-фильтры, добавлен ползунок температуры
- 🌒 **Виньетка исправлена** - Теперь корректно отображается поверх видео
- 🌐 **Исправлена локализация** - Русский интерфейс наконец отображается (баг CSP в MV3)
- ⌨️ **Настоящие горячие клавиши** - Alt+Shift+V вкл/выкл, Alt+Shift+R сброс (настраиваются)
- 🖼️ **Поддержка iframe** - Обрабатываются встроенные плееры
- 🔇 **Надёжность звука** - Исправлено пропадание звука из-за приостановленного/закрытого AudioContext

### ✨ Что нового в v2.0

- 🌐 **Поддержка языков** - Русский и английский интерфейс
- 🎵 **10-полосный эквалайзер** - Профессиональный контроль частот
- 🎨 **Улучшенные видео эффекты** - Прозрачность, виньетка, температура
- 🔊 **Улучшенный аудио движок** - Кристально чистый звук
- 🎭 **8 встроенных пресетов** - Готовые настройки на все случаи
- 🎯 **Современный UI/UX** - Плавные анимации
- ⚡ **Оптимизация** - Лучшее качество и производительность

### 🌟 Основные функции

#### 🎬 Продвинутая обработка видео
- **Базовые настройки**: Яркость, Контраст, Насыщенность (0-200%)
- **Цветокоррекция**: Оттенок, Ч/Б, Сепия
- **Качество**: Резкость, Размытие
- **Эффекты**: Инверсия, Прозрачность, Виньетка
- **Температура цвета**: Тёплые/холодные тона

#### 🔊 Профессиональный звук
- **Громкость**: До 200% без искажений
- **10-полосный эквалайзер**: От 32Гц до 16кГц
- **Басы**: Точная настройка ±20дБ
- **Стерео**: Панорама, Реверс каналов
- **Эффекты**: Реверберация, Задержка/Эхо

#### 🎭 Система пресетов
- **Кинематограф** - Эффект кинотеатра
- **Винтаж** - Ретро-вид с сепией
- **Ночной режим** - Для комфортного просмотра
- **Усиление баса** - Мощный бас
- **Чёткость речи** - Для подкастов и лекций
- **Тёплые/Холодные тона** - Атмосфера
- **Высокий контраст** - Максимальная резкость

### 🚀 Установка

#### Из Chrome Web Store
[![Доступно в Chrome Web Store](https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/UV4C4ybeBTsZt43U4xis.png)](https://chrome.google.com/webstore/detail/efkidfgpglnlabaphedbiglpdaigfkpj)

### 💖 Поддержать проект

[![Buy Me A Coffee](https://img.shields.io/badge/Купить%20мне%20кофе-Поддержать-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/aristarh.ucolov)

---

**Made with ❤️ by Aristarh Ucolov**
