"use strict"; //строгий режим

//MOBILE = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
const MOBILE = (navigator.maxTouchPoints > 0) && ('orientation' in window) // mobile | desktop

const img_width = 1920; // (px)
const img_height = 616; // (px)
const images_total = 120 //количество изображений в каталоге
const images_motanie = 15; //количество кадров мотания
const images_povorot = 15; //количество кадров поворота
const delay_povorot = 50; //(ms) задержка кадров поворота
const delay_motanie = 30; //(ms) задержка кадров мотания 
const delay_motfast = 1; //(ms) задержка кадров мотания при поворотах 

var House; // объект домиков/backgroumd (кнопки)
var Doors; // объект дверей/object (слайдер)
var Images;// объект загрузки файлов
var Scene; // объект кадров сцены (анимация)
var TouchEvents; // объект реакций на пермещение мышки / тача

window.addEventListener("load", () => {
    Scene = new ClassSceneAnimation();
    Images = new ClassImagesLoader();
    House = new ClassHouseObject({ folder: "background", sub: 1 });
    Doors = new ClassDoorsObject({ folder: "object", sub: 1 });
    TouchEvents = new ClassMouseTouchEvents();
});


class ClassMouseTouchEvents { /*********** перемещения мыши / тачпада ***********/
    mouse_area = document.querySelector(".mouse-area"); //область реакции на мышку
    lastX;
    newX;
    offsetX; //предыдущееи и новое положение мышки/тача
    constructor() {
        if (MOBILE) { //мотание и повороты в мобилке
            this.mouse_area.addEventListener('touchstart', (e) => {
                this.lastX = e.changedTouches[0].clientX;
            }, { passive: true });
            this.mouse_area.addEventListener('touchend', (e) => {
                this.newX = e.changedTouches[0].clientX;
                this.offsetX = this.newX - this.lastX;
                if (Math.abs(offsetX) > 100) //длинный свап - поворот
                    if (this.offsetX < 0) Scene.turn_forward();
                    else Scene.turn_backward();
                else if (Math.abs(this.offsetX) > 10) //которкий свап - мотание
                    Scene.motion(this.offsetX);
            });
        } else { //мотание на компьютере
            this.mouse_area.addEventListener("mousemove", (e) => {
                this.newX = e.clientX;
                if (!this.lastX) this.lastX = this.newX; //инициализация начального положения
                this.offsetX = this.newX - this.lastX;
                if (Math.abs(this.offsetX) > 3)
                    Scene.motion(this.offsetX);
                this.lastX = this.newX;
            });
        }
    }
}


class ClassSceneAnimation { /********* АНИМАЦИЯ ******************/
    container = document.querySelector(".container"); //контейнер всей сцены
    canvas = document.querySelector("canvas"); // "экранный" канвас
    context = this.canvas.getContext("2d", { willReadFrequently: true });
    height = this.canvas.height = img_height; //вертикальное разрешение
    width; //зависит от параметров экрана
    animationID; // requestID анимации, для остановки
    amination_started = false; //флаг, true - анимация происходит в настоящий момент
    frm_total = images_total + images_motanie; //общее количество кадров + ещё одно мотание в конце
    frm_period = images_povorot + images_motanie;
    frm_center = ~~(this.frm_total / 2); //центральный кадр
    frm_current = this.frm_center; //текущий кадр анимации (при запуске - центр)
    frm_start = 61; //начальный кадр мотания (изображение 61.jpg)
    frm_end = 75;   //конечный кадр мотания (изображение 75.jpg)
    img_sx; //(px) смещение кадра влево (для вертик режима)

    constructor() {
        this.imgnum = []; //массив соответствия номера кадра и номера изображения и задержки кадров
        for (let frm = 1; frm <= this.frm_total; frm++) { //TODO решить вопрос с переходом через ноль в функции move()
            let center = images_total / 2; //todo важно правильно рассчитать центровой кадр
            let img = (frm > center ? frm - center : frm + center);
            let chet = ~~(~~(frm / 15) % 2); //номера кадров поворота todo (15, но нужна формула)
            let del = (chet ? delay_povorot : delay_motfast); //задержка кадра в зависимости от номера кадра
            this.imgnum[frm] = { image: img, delay: del }; //каждому кадру соответствует номер изображения и задержка анимации
        }
        window.addEventListener("resize", () => setTimeout(() => { this.resize() }, 100));
        document.querySelector(".move_center").addEventListener("click", () => {
            this.stopmove(); //остановить мотание (иначе будет накладка анимаций)
            this.move(this.frm_center);
            this.frm_start = 61; //todo старт первичного мотания
            this.frm_end = 75; //todo конец первичного мотания
        });
        document.querySelector(".move_forward").addEventListener("click", () => { this.turn_forward() });
        document.querySelector(".move_backward").addEventListener("click", () => { this.turn_backward() });
        this.resize(); //setTimeout(() => { this.resize() }, 100);
    }

    motion(dir) {
        if (dir > 0)
            this.move(this.frm_end, delay_motanie);
        else
            this.move(this.frm_start, delay_motanie);
    };

    turn_forward() { // поворот вперёд 
        this.stopmove(); //остановить мотание (иначе будет накладка анимаций)
        this.move(this.frm_end + images_povorot + 1); //анимация мотания до конца + поворот
        if (this.frm_end < this.frm_total) {
            this.frm_start += this.frm_period; //старт следующего мотания
            this.frm_end += this.frm_period; //конец следующего мотания
            Images.loadall(this.frm_start, this.frm_end + images_povorot); //загрузка следующего мотания!
        }
    };

    turn_backward() { // поворот назад 
        this.stopmove(); //остановить мотание (иначе будет накладка анимаций)
        this.move(this.frm_start - (images_povorot + 1));
        if (1 < this.frm_start) {
            this.frm_start -= this.frm_period; //старт следующего мотания
            this.frm_end -= this.frm_period; //конец следующего мотания
            Images.loadall(this.frm_start - images_povorot, this.frm_end); //загрузка следующего мотания!
        }
    };

    resize() { // resize сцены (пересчёт размеров канваса + отрисовка текущего кадра)
        this.img_sx = ((innerWidth < innerHeight) ? ~~(this.container.clientHeight * 0.3) : 0); //смещение кадра влево для вертик режима
        this.width = this.canvas.width = img_height * (this.container.clientWidth / this.container.clientHeight);  //горизонтальное разрешение
        this.move();
    }

    move(last = this.frm_current, delay) { //first - первый кадр, last - последений кадр, delay - задержка кадра
        if (this.amination_started) return; //блокирование повторного запуска анимации
        this.amination_started = true;
        let time_start = performance.now(); //время старта отрисовки кадра
        let error_timer = 0; //защита от бесконечного цикла попытки скачать несуществующий файл изображения
        let direction = (this.frm_current <= last ? +1 : -1); //направление анимации

        const animate = (time) => {
            let dl = (delay ? delay_motanie : this.imgnum[this.frm_current].delay);
            if (time - time_start > dl) {
                time_start = time;
                LAB(`${(MOBILE ? "mobile" : "desktop")} : ${this.imgnum[this.frm_current].image}.jpg : ${dl}ms`); //DEBUG
                let H = House.img[this.frm_current];
                let D = Doors.img[this.frm_current];
                if (H && D) { //если оба слайда загружены
                    if (MOBILE) { //режим background-image (в мобильном режиме canvas тормозит)
                        this.container.style.background = "url(" + D.src + ") left top / cover";
                        this.container.style.background += ", url(" + H.src + ") left top / cover";
                        this.container.style.backgroundPosition = -this.img_sx + "px";
                    } else { //режим canvas
                        this.context.drawImage(H, this.img_sx, 0, this.width, this.height, 0, 0, this.width, this.height);
                        this.context.drawImage(D, this.img_sx, 0, this.width, this.height, 0, 0, this.width, this.height);
                    }
                    this.frm_current += direction; //примечание: в конце номер будет на 1 отличаться от текущего положения
                } else { //ждём когда загрузится нужный кадр
                    Images.loadall(this.frm_current); //на всяк случай кидаем этот кадр в загрузку
                    if (error_timer++ > 100) {  //если кадр таки не загрузится
                        console.log("error animation frame:" + this.frm_current + " not found!");
                        this.stopmove();
                    }
                }
            }
            this.animationID = requestAnimationFrame(animate);
            if (this.frm_current == last + direction
                || this.frm_current < 1
                || this.frm_current > this.frm_total) {
                this.frm_current -= direction; // откат на один шаг
                this.stopmove();
                if (this.frm_current < 1) this.frm_current = 1; //коррекция на всяк случай
                if (this.frm_current > this.frm_total) this.frm_current = this.frm_total; //коррекция на всяк случай
            }
        };

        this.animationID = requestAnimationFrame(animate);
    }

    stopmove() {
        cancelAnimationFrame(this.animationID);
        this.amination_started = false;
        Doors.display(60 <= this.frm_current && this.frm_current <= 76);
    }
}


class ClassHouseObject {  /*********** домики / background ******************/
    img = []; //массив Image объектов изображений двери (кадров)
    fld = "background";
    sub = 0; // нумерация с НУЛЯ !!!
    ext = ".jpg";
    arr_houses = [
        { src: "fence_color_yellow.png", name: "Сосна" }, //prefix: "_1"
        { src: "fence_color_brown.png", name: "Лиственница" }, //prefix: "_2"
        { src: "fence_color_brown_black.png", name: "Палисандр" } //prefix: "_3"
    ];
    list_houses;
    constructor(params) {
        this.fld = params.folder;
        this.sub = params.sub - 1; // нумерация с НУЛЯ !!!
        //HTML инициализация кнопок изменения декора домика
        for (let i = 0; i < this.arr_houses.length; i++) {
            let decor_house = document.createElement("div");
            document.querySelector(".control_decor_house").appendChild(decor_house);
            decor_house.classList.add('decor_house');
            decor_house.style.background = "url(images/fence_color/" + this.arr_houses[i].src + ") left top / cover no-repeat";
            decor_house.setAttribute("data-text", this.arr_houses[i].name);
        };
        this.list_houses = document.querySelectorAll('.decor_house');
        this.list_houses.forEach((btn, i) => btn.addEventListener('click', () => { this.check(i) }));
        document.querySelector(".mouse-area").addEventListener('click', () => {
            this.list_houses[this.sub].removeAttribute("data-selected");
            this.sub++;
            if (this.sub > this.arr_houses.length - 1) this.sub = 0;
            this.check(this.sub);
        });
        this.init();
    }
    init() {
        this.list_houses[this.sub].setAttribute("data-selected", null);
        document.querySelector(".control_decor_title span").textContent = this.arr_houses[this.sub].name;
        Images.load(this, Scene.frm_start - images_povorot, Scene.frm_end + images_povorot); //предзагрузка кадров поворотов и мотания
    }
    check(new_sub) {
        this.list_houses[this.sub].removeAttribute("data-selected");
        this.sub = new_sub;
        this.img = []; //очистка массива изображений
        this.init();
        window.setTimeout(() => { Scene.move() }, 100);
    }
}


class ClassDoorsObject { /*********** двери / object *********************/
    img = []; //массив  Image объектов изображений двери (кадров)
    fld = "object";
    sub = 0;
    ext = ".png";
    slider = document.querySelector('.slider');
    sliderLine = document.querySelector('.slider-line');
    sliderNumb = document.querySelectorAll('.slider-item').length;
    sliderWidth;
    title = document.querySelector(".control_door_title span");

    constructor(params) {
        this.fld = params.folder;
        this.sub = params.sub - 1; //нумерация с НУЛЯ !!!
        document.querySelector(".door_prev").addEventListener("click",
            () => { this.check(-1) });
        document.querySelectorAll('.door_next').forEach((button) => button.addEventListener('click',
            () => { this.check(+1) }));
        window.addEventListener("resize", () => this.rollSlider());
        this.check();
    }

    rollSlider() {
        this.sliderWidth = this.slider.clientWidth;
        this.sliderLine.style.width = this.sliderWidth * this.sliderNumb + 'px';
        this.sliderLine.style.transform = 'translate(-' + this.sub * this.sliderWidth + 'px)';
    }

    check(dir = 0) { // if (!dir) dir = 0;
        this.sub += dir;
        if (this.sub < 0) this.sub = 2;
        if (this.sub > 2) this.sub = 0;
        this.rollSlider();
        this.title.textContent = this.sub + 1;
        this.img = []; //обнулить массив изображений
        Images.load(this, Scene.frm_start - images_povorot, Scene.frm_end + images_povorot); //предзагрузка кадров поворотов и мотания
        window.setTimeout(() => { Scene.move() }, 100);
    }

    doorarea = document.querySelector(".door_area");
    display(m) { //блок клацанья по двери в сцене включать только для центральных кадров (где видна дверь)
        if (m) this.doorarea.style.display = "block";
        else this.doorarea.style.display = "none";
    }
}


class ClassImagesLoader { /*************  загрузка файлов ****************/
    loadall(start, end = start) { //start, end - номера первого и последнего кадра (если задан один параметр - грузим один (start) кадр)
        this.load(House, start, end);   //загрузка кадров домика
        this.load(Doors, start, end);   //загрузка кадров двери
    }
    load(obj, start, end) { //obj = текущий объект - House или Doors
        if (end > Scene.frm_total) end = Scene.frm_total; //коррекция на всяк случай ограничить верхний предел
        if (start < 0) start = 1; //коррекция на всяк случай ограничить нижний предел
        this.display(end - start + 1);  //добавить в счетчик новые кадры
        for (let frm = start; frm <= end; frm++) {
            if (obj.img[frm] != undefined) { //если уже загружен (=image) или грузится (= 0)
                this.display(-1);
                continue;
            }
            obj.img[frm] = 0; //флаг - ставим файл в загрузку
            let image = new Image();
            image.src = "./scene/" + obj.fld + "_" + (obj.sub + 1) + "/" + Scene.imgnum[frm].image + obj.ext; //загрузка изображения
            image.onload = () => {
                obj.img[frm] = image;
                this.display(-1);
            }
            image.onerror = () => {
                console.log("error loading image:" + image.src + " !");
                this.display(-1);
            }
        }
    }

    count = 0; // счётчик запущеных загрузок файлов
    div_ind = document.querySelector(".load_spinner");
    display(dif) { //отображение/отключение спиннера загрузки
        this.count += dif;
        if (this.count > 0)
            this.div_ind.style.visibility = "visible";
        else {
            this.div_ind.style.visibility = "hidden";
            this.count = 0; //на всякий случай
        }
    }
}
