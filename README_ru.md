# Box4Magisk / KernelSU / APatch

[English](README.md) | [中文](README_zh.md) | [Русский](README_ru.md)

Этот проект — модуль Magisk / KernelSU / APatch для развертывания различных прокси-ядер на Android-устройствах, включая **clash**, **mihomo**, **sing-box**, **v2ray**, **xray** и **hysteria**.

Поддерживаемые режимы прозрачного прокси:
- **REDIRECT**: только TCP
- **TPROXY**: TCP + UDP (приоритет по умолчанию)
- **TUN**: TCP + UDP (предоставляется ядром; поддерживается только sing-box, clash, mihomo и xray)
- **Гибридный режим**: REDIRECT (TCP) + TUN (UDP)

По сути, проект объединяет лаунчер прокси-ядра и [AndroidTProxyShell](https://github.com/CHIZI-0618/AndroidTProxyShell) для реализации прозрачного проксирования.

## Disclaimer

Проект не несёт ответственности за «окирпичивание» устройства, потерю данных или любые другие аппаратные/программные проблемы.

**Важное предупреждение**: убедитесь, что ваш файл конфигурации не вызывает зацикливание трафика, иначе это может привести к бесконечной перезагрузке устройства!

Если вы не знакомы с настройкой прокси, рекомендуется сначала использовать более удобные приложения (например, ClashForAndroid, sing-box for Android, v2rayNG, SagerNet и т.д.), чтобы изучить базовые концепции.

## Установка

1. Скачайте последний ZIP-пакет модуля из [Releases](https://github.com/stayer147/box4root/releases).
2. Установите его через Magisk Manager, KernelSU Manager или APatch Manager.
3. Поддерживается онлайн-обновление (после обновления изменения вступают в силу сразу, без перезагрузки).

**Примечание**: модуль не содержит бинарные файлы прокси-ядра.

После установки вручную скачайте исполняемые файлы ядра для архитектуры вашего устройства и поместите их в каталог `/data/adb/box/bin/`.

## конфигурация

### Выбор ядра прокси

Рабочий каталог ядра: `/data/adb/box/<core_name>`  
Ядро определяется переменной `bin_name` в `/data/adb/box/scripts/box.config`. Доступные варианты:

- `sing-box` (рекомендуется, по умолчанию)
- `clash`
- `mihomo`
- `xray`
- `v2ray`
- `hysteria`

**Совет**: `mihomo` и `sing-box` содержат файлы конфигурации по умолчанию, уже подготовленные для прозрачного прокси. Рекомендуется напрямую редактировать секции `proxy-providers` или `outbounds`, чтобы добавить ваши узлы.

Для расширенной настройки см. официальную документацию:
- [Clash](https://github.com/Dreamacro/clash/wiki/configuration)
- [Mihomo](https://wiki.metacubex.one)
- [sing-box](https://sing-box.sagernet.org/)
- [V2Ray](https://www.v2fly.org/)
- [Xray](https://xtls.github.io/)
- [Hysteria](https://v2.hysteria.network/)

Модуль автоматически проверяет корректность файла конфигурации; результаты сохраняются в `/data/adb/box/run/check.log`.

### Main Configuration Options

Ниже перечислены ключевые параметры в `/data/adb/box/scripts/tproxy.conf`. Обратите особое внимание на корректную настройку переменных `*_INTERFACE` (например, `MOBILE_INTERFACE="rmnet_data+"`, `WIFI_INTERFACE="wlan0"`, `HOTSPOT_INTERFACE="wlan2"`, `USB_INTERFACE="rndis+"`) в соответствии с фактическими именами интерфейсов на вашем устройстве (проверьте через `ifconfig` или `ip link`).

| Configuration Item              | Default Value       | Description |
|---------------------------------|---------------------|-------------|
| `CORE_USER_GROUP`               | `root:net_admin`    | Пользователь и группа, от имени которых запускается прокси-ядро. Продвинутые пользователи могут изменить параметр (требуется поддержка setcap). **Должно совпадать со значением переменной `box_user_group` в box.config** |
| `PROXY_TCP_PORT` / `PROXY_UDP_PORT` | `1536`            | Порт прослушивания прозрачного прокси |
| `PROXY_MODE`                    | `0`                 | Режим проксирования: `0=auto` (предпочтительно TPROXY), `1=TPROXY`, `2=REDIRECT`, `any other value` (запуск только ядра для поддержки нативного TUN) |
| `DNS_HIJACK_ENABLE`             | `1`                 | DNS hijacking (0=выключено, 1=включён TPROXY, 2=включён REDIRECT; обычно менять не требуется) |
| `DNS_PORT`                      | `1053`              | Порт DNS-прослушивания |
| `MOBILE_INTERFACE`              | `rmnet_data+`       | Имя интерфейса мобильной сети |
| `WIFI_INTERFACE`                | `wlan0`             | Имя интерфейса Wi‑Fi |
| `HOTSPOT_INTERFACE`             | `wlan2`             | Имя интерфейса точки доступа |
| `USB_INTERFACE`                 | `rndis+`            | Имя интерфейса USB-модема |
| `PROXY_MOBILE`                  | `1`                 | Проксировать ли мобильный трафик (1=да, 0=нет; можно комбинировать с другими интерфейсами) |
| `PROXY_WIFI`                    | `1`                 | Проксировать ли трафик Wi‑Fi (1=да, 0=нет; можно комбинировать с другими интерфейсами) |
| `PROXY_HOTSPOT`                 | `0`                 | Проксировать ли трафик точки доступа (1=да, 0=нет; можно комбинировать с другими интерфейсами; при включении действует MAC-фильтрация) |
| `PROXY_USB`                     | `0`                 | Проксировать ли трафик USB-модема (1=да, 0=нет; можно комбинировать с другими интерфейсами) |
| `PROXY_TCP` / `PROXY_UDP`       | `1` / `1`           | Проксировать ли TCP/UDP (1=да, 0=нет) |
| `PROXY_IPV6`                    | `0`                 | Проксировать ли IPv6 (1=да, 0=выключено; в режиме REDIRECT модуль автоматически проверит поддержку ядром `IP6_NF_NAT` и `IP6_NF_TARGET_REDIRECT`. Если поддержки нет, проксирование IPv6 будет отключено) |
| `APP_PROXY_ENABLE`              | `0`                 | Включить проксирование по приложениям (1=включить) |
| `APP_PROXY_MODE`                | `blacklist`         | `blacklist` (обход указанных приложений) или `whitelist` (проксирование только указанных приложений) |
| `BYPASS_APPS_LIST` / `PROXY_APPS_LIST` | empty          | Список приложений, формат: `"userID:packageName"` (несколько записей через пробел, например `"0:com.android.systemui 10:com.tencent.mm"`) |
| `BYPASS_CN_IP`                  | `0`                 | Обход IP материкового Китая (1=включить, 0=выключить; требуется поддержка `ipset` в ядре. Модуль проверяет это автоматически; при отсутствии поддержки функция будет отключена. При включении списки IP загружаются по заданному URL) |
| `MAC_FILTER_ENABLE`             | `0`                 | Включить фильтрацию по MAC-адресам (1=включить, 0=выключить; работает только при `PROXY_HOTSPOT=1`) |
| `MAC_PROXY_MODE`                | `blacklist`         | `blacklist` (обход указанных MAC) или `whitelist` (проксирование только указанных MAC) |
| `BYPASS_MACS_LIST` / `PROXY_MACS_LIST` | empty          | Список MAC-адресов (несколько записей через пробел, например `"AA:BB:CC:DD:EE:FF 11:22:33:44:55:66"`) |

Другие параметры см. в [AndroidTProxyShell](https://github.com/CHIZI-0618/AndroidTProxyShell?tab=readme-ov-file#full-configuration-variables).

## Usage

### Normal Usage (Recommended)

- Сервис по умолчанию включён при загрузке.
- Включайте/выключайте модуль через **Magisk / KernelSU / APatch Manager**, чтобы запускать/останавливать сервис в реальном времени (без перезагрузки устройства).

#### Per-App Proxy (Routing)

После включения `APP_PROXY_ENABLE=1`:
- **Режим blacklist** (по умолчанию): проксируются все приложения, кроме указанных в списке (используйте `BYPASS_APPS_LIST`).
- **Режим whitelist**: проксируются только указанные приложения (используйте `PROXY_APPS_LIST` и установите `APP_PROXY_MODE=whitelist`).

#### Using Only the Core's Native TUN (No Transparent Proxy)

Установите `PROXY_MODE=core` или любое значение, отличное от 0-2. Правила прозрачного прокси не будут загружены; запустится только ядро (подходит для TUN inbound в sing-box/clash/mihomo).

### Ручной режим

После создания пустого файла `/data/adb/box/manual`:
- Сервис больше не будет запускаться при загрузке и не сможет управляться через Manager.
- Ручные команды:
  - Сервис: `/data/adb/box/scripts/box.service start|stop|restart|status`
  - Прозрачный прокси: `/data/adb/box/scripts/box.tproxy start|stop|restart`

## Дополнительные заметки

- После изменения файла конфигурации ядра убедитесь, что порты и другие настройки совпадают с `box.config` и `tproxy.conf`.
- Модуль автоматически предотвращает зацикливание (обходит локальные IP и использует возможность NETFILTER_XT_MATCH_ADDRTYPE). Однако если устройство имеет публичный IP, всё равно рекомендуется вручную добавить [правила обхода](box/scripts/tproxy.conf#L55-L58).
- Логи находятся в каталоге `/data/adb/box/run/`.
- При обновлении документации изменения в ключевых разделах (`Installation`, `Configuration`, `Usage`, `Uninstallation`, `Changelog`) необходимо синхронно отражать во всех языковых README (`README.md`, `README_zh.md`, `README_ru.md`).

## Changelog

[CHANGELOG](changelog.md)
