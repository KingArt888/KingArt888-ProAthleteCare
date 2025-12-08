// exercise_library.js
// Розширена бібліотека вправ для ProAtletCare.
// Включає більше варіацій для активації, сили, вибуховості та відновлення.

const EXERCISE_LIBRARY = {
    
    // =========================================================
    // 1. PRE-TRAINING (ПЕРЕДТРЕНУВАЛЬНА ПІДГОТОВКА)
    // =========================================================
    "Pre-Training": {
        
        "Mobility": [
            { name: "Обертання у кульшовому суглобі (Hip Circles)", description: "10 обертань всередину та 10 назовні на кожну ногу.", videoKey: "hip_circles_v1" },
            { name: "Кішка-Корова (Cat-Cow Stretch)", description: "15 повільних повторень, синхронізуючи з диханням.", videoKey: "cat_cow_v1" },
            { name: "Динамічні випади з поворотом", description: "5 повторень на кожну ногу, затримуючись у нижній точці.", videoKey: "lunge_twist_v1" },
            { name: "Рух 'Світч-Кік'", description: "20 змін ніг. Контролюйте амплітуду.", videoKey: "switch_kick_v2" },
            { name: "Розкриття грудної клітки лежачи", description: "10 повторень на кожну сторону. Фокус на ротації.", videoKey: "t_spine_rotation_v1" },
            { name: "Присідання 'Горила' (Goblet Squat Mobility)", description: "2 підходи по 15 повторень, використовуючи лікті для розширення колін.", videoKey: "gorilla_squat_v1" },
        ],
        
        "Activation": [
            { name: "Сідничний місток (Glute Bridge)", description: "3 підходи по 12 повторень, утримуючи пікове скорочення 2 сек.", videoKey: "glute_bridge_v1" },
            { name: "Планка з дотягуванням (Shoulder Taps)", description: "3 підходи по 20 торкань. Слідкуйте за стабільністю корпусу.", videoKey: "shoulder_taps_v1" },
            { name: "YTWL для плечей", description: "2 підходи по 8 повторень на кожну літеру, без ваги.", videoKey: "ytwl_v1" },
            { name: "Міні-бенд кроки вбік (Band Side Steps)", description: "3 підходи по 15 кроків в кожен бік. Фокус на середній сідничній.", videoKey: "band_side_steps_v1" },
            { name: "Пташка-Собака (Bird-Dog)", description: "3 підходи по 10 повільних повторень на кожну сторону.", videoKey: "bird_dog_v1" },
            { name: "Активація преса (Dead Bug)", description: "3 підходи по 10 повільних повторень. Контроль попереку.", videoKey: "dead_bug_v1" },
        ]
    },

    // =========================================================
    // 2. MAIN TRAINING (ОСНОВНЕ ТРЕНУВАННЯ)
    // =========================================================
    "Main Training": {
        
        "Legs": [
            { name: "Присідання зі штангою (Back Squat)", description: "5x5, RPE 7-8. Техніка важливіша за вагу.", videoKey: "back_squat_v1" },
            { name: "Румунська тяга з гантелями (RDL)", description: "3 підходи по 10-12 повторень. Максимальне розтягнення задньої поверхні стегна.", videoKey: "rdl_dumbbell_v1" },
            { name: "Болгарські присідання", description: "3 підходи по 10 повторень на кожну ногу (з власною вагою/гантелями).", videoKey: "bulgarian_split_v1" },
            { name: "Жим ногами (Leg Press)", description: "4 підходи по 12 повторень. Середній темп.", videoKey: "leg_press_v1" },
            { name: "Стрибки на тумбу (Box Jumps)", description: "3 підходи по 8 вибухових стрибків. Фокус на приземленні.", videoKey: "box_jumps_v1" },
            { name: "Розгинання ніг в тренажері (Leg Extensions)", description: "3 підходи по 15 повторень, акцент на пікове скорочення.", videoKey: "leg_extensions_v1" },
        ],
        
        "Core": [
            { name: "Скручування 'Велосипед' (Bicycle Crunch)", description: "3 підходи по 30 секунд. Контрольований рух.", videoKey: "bicycle_crunch_v1" },
            { name: "Планка на ліктях (Elbow Plank)", description: "3 підходи по 60 секунд. Утримуйте нейтральне положення хребта.", videoKey: "plank_elbow_v1" },
            { name: "Підйом ніг лежачи (Leg Raises)", description: "3 підходи по 15 повторень. Не відривайте поперек від підлоги.", videoKey: "leg_raises_v1" },
            { name: "Скручування 'Книжка' (Book Crunch)", description: "3 підходи по 12 повторень. Робота верхнього і нижнього преса одночасно.", videoKey: "book_crunch_v1" },
            { name: "Тяга тросу на колінах (Kneeling Cable Crunch)", description: "3 підходи по 15 повторень. Використовуйте середню вагу.", videoKey: "cable_crunch_v1" },
            { name: "Російський твіст (Russian Twist)", description: "3 підходи по 20 торкань (з гантеллю/м'ячем).", videoKey: "russian_twist_v1" },
        ],
        
        "UpperBody": [
            { name: "Жим лежачи (Bench Press)", description: "4 підходи по 8 повторень. Середня вага.", videoKey: "bench_press_v1" },
            { name: "Тяга гантелей в нахилі (Dumbbell Row)", description: "3 підходи по 12 повторень на кожну руку. Фокус на лопатках.", videoKey: "dumbbell_row_v1" },
            { name: "Віджимання від підлоги (Push-ups)", description: "3 підходи до відмови. Контроль фази опускання.", videoKey: "pushups_v1" },
            { name: "Жим гантелей стоячи (Overhead Press)", description: "4 підходи по 10 повторень. Контроль корпусу.", videoKey: "overhead_press_v1" },
            { name: "Підтягування (Pull-ups/Lat Pulldown)", description: "4 підходи по 8-12 повторень (залежно від рівня).", videoKey: "pull_ups_v1" },
            { name: "Розведення гантелей в сторони (Lateral Raises)", description: "3 підходи по 15 повторень. Легка вага, ідеальна техніка.", videoKey: "lateral_raises_v1" },
        ]
    },

    // =========================================================
    // 3. POST-TRAINING (ПІСЛЯТРЕНУВАЛЬНЕ ВІДНОВЛЕННЯ)
    // =========================================================
    "Post-Training": {
        
        "Recovery": [
            { name: "Розтяжка згиначів стегна (Hip Flexor Stretch)", description: "Утримувати 45 секунд на кожну сторону.", videoKey: "hip_flexor_stretch_v1" },
            { name: "Розтяжка грудних м'язів у дверному отворі", description: "3 підходи по 30 секунд. Глибоке дихання.", videoKey: "chest_stretch_v1" },
            { name: "Розтяжка квадрицепсів стоячи", description: "Утримувати 30 секунд на кожну ногу.", videoKey: "quad_stretch_v1" },
            { name: "Розтяжка підколінного сухожилля (Hamstring Stretch)", description: "45 секунд у положенні сидячи або стоячи.", videoKey: "hamstring_stretch_v1" },
            { name: "Розтяжка трицепса і плечей", description: "30 секунд на кожну руку.", videoKey: "triceps_stretch_v1" },
            { name: "Дихальні вправи лежачи (Belly Breathing)", description: "5 хвилин повільного діафрагмального дихання.", videoKey: "belly_breathing_v1" },
        ],
        
        "FoamRolling": [
            { name: "Рол для квадрицепсів", description: "90 секунд на кожну ногу. Працювати повільно, зупиняючись на больових точках.", videoKey: "foam_quads_v1" },
            { name: "Рол для сідниць та зовнішньої сторони стегна (IT Band)", description: "90 секунд на кожну ногу. Обережно на IT-ділянці.", videoKey: "foam_glutes_v1" },
            { name: "Рол для верхньої частини спини", description: "60 секунд. Рухатися від попереку до плечей.", videoKey: "foam_back_v1" },
            { name: "Рол для литкових м'язів (Calves)", description: "60 секунд на кожну ногу, обертаючи ногу для зовнішньої/внутрішньої частини.", videoKey: "foam_calves_v1" },
            { name: "Рол для привідних м'язів (Adductors)", description: "90 секунд на кожну ногу, лежачи обличчям вниз.", videoKey: "foam_adductors_v1" },
        ]
    }
};
