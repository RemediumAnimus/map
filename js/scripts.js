(function(){
    var myMap;
    var firstload = false;
    var buttonAdded = false;
    var currentFrom;
    var currentTo;

    ymaps.ready(['DeliveryCalculator']).then(init);

    function init(){
        var center = [55.0090417, 73.2974358];
        var aero = {
            coords: [54.9574868, 73.3169836],
            name: "Аэропорт Омск (центральный)"
        };
        var trainStation = {
            coords: [54.9388991, 73.3732867],
            name: "Станция Омск-Пассажирский"
        };
        var autoStation = {
            coords:[54.9973097, 73.2825844],
            name: "пр. Комарова, 2, Омск"
        };
        var centerCity = {
            coords:[54.9819256, 73.3782612],
            name: "Россия, Омск, площадь Ленина"
        };

        myMap = new ymaps.Map("n-map", {
            center: center,
            zoom: 15,
            controls: [
                "zoomControl",
            ]
        }, {suppressMapOpenBlock: true});

        var myPlacemark = new ymaps.Placemark(center,{

        },{
            iconLayout: 'default#image',
            iconImageHref: "img/marker.png",
            iconImageSize: [55, 75],
            iconOffset: [-15,-25]
        });

        myMap.geoObjects.add(myPlacemark);

        var searchFinishPoint = new ymaps.control.SearchControl({
            options: {
                useMapBounds: true,
                noCentering: true,
                noPopup: true,
                noPlacemark: true,
                placeholderContent: 'Адрес отправной точки',
                size: 'large',
                float: 'left',
            }
        });

        var myCollection = new ymaps.GeoObjectCollection();
        var calculator = new ymaps.DeliveryCalculator(myMap);
        var point;

        myMap.geoObjects.add(myCollection);

        searchFinishPoint.events
            .add('resultselect', function (e) {
                var results = searchFinishPoint.getResultsArray(),
                    selected = e.get('index');
                point = results[selected].geometry.getCoordinates();
                setPath(point,center,"auto");
                ymaps.geocode(point).then(function (res) {
                 var firstGeoObject = res.geoObjects.get(0);
                    $('#n-head').html(firstGeoObject.properties.get('name'));
                 });
                myCollection.removeAll();
                $('.n-infoblock').hide();
                $('#busBtn').removeClass('active');
                $(this).addClass('active');
            })
            .add('load', function (event) {
                if (!event.get('skip') && searchFinishPoint.getResultsCount()) {
                    searchFinishPoint.showResult(0);
                    myMap.controls.add(searchFinishPoint);
                }
            });

        function checkButton() {
            $('.n-infoblock').hide();
            $('.n-infoblock__val').html('');
            $('.n-infoblock__subheader').html('');
            $('.n-btns').show();
            $('#busBtn').removeClass('active');
            $('#autoBtn').addClass('active');
        }

        function changePath(destination, ctx, mode) {
            myMap.controls.remove(searchFinishPoint);
            myCollection.removeAll();
            setPath(destination.name, center, mode);
            $('.n-part__tabs li').removeClass('active');
            ctx.addClass('active');
        }
        
        $('#autoBtn').click(function(){
            $('#busBtn').removeClass('active');
            $(this).addClass('active');
            myCollection.removeAll();
            setPath(currentFrom, currentTo, "auto");
            $('.n-infoblock').hide();
        });

        $('#busBtn').click(function(){
            if ($('.n-infoblock').css('display') != 'none') { return }
            $(this).addClass('active');
            $('#autoBtn').removeClass('active');
            myCollection.removeAll();
            setPath(currentFrom, currentTo, "masstransit");
            $('.n-infoblock').show();
        });

        $('.n-s1').click(function(){
            checkButton();
            changePath(aero,$(this),"auto");
        });

        $('.n-s2').click(function(){
            checkButton();
            changePath(trainStation,$(this),"auto")
        });
        $('.n-s3').click(function(){
            checkButton();
            changePath(autoStation,$(this),"auto")
        });
        $('.n-s4').click(function(){
            checkButton();
            changePath(centerCity,$(this),"auto")
        });

        var router = new ymaps.control.RouteEditor();
        $('.n-s5').click(function(){
            checkButton();
            myCollection.removeAll();

            myMap.controls.add(searchFinishPoint);

            $('.n-part__tabs li').removeClass('active');
            $(this).addClass('active');
        });


        function setPath(from, to, mode) {
            currentFrom = from;
            currentTo = to;
            ymaps.route([
                from, to
            ],{
                multiRoute: true,
                routingMode: mode,
                mapStateAutoApply: true
            }).then(
                function (multiRoute) {
                    var transports = [];
                    var points = multiRoute.getWayPoints();
                    var adress = multiRoute.getRoutes().get(0).properties.get('text');
                    var time = multiRoute.getRoutes().get(0).properties._data.duration.text;
                    var dest = multiRoute.properties.getAll().waypoints[0].name;
                    var step;
                    if (dest) {
                        $('#n-head').html(dest);
                    }
                    $('.n-infoblock__val').html('');
                    myCollection.add(multiRoute);
                    points.get(1).options.set('visible', false);
                    multiRoute.getRoutes().each(function (route) {
                        /**
                         * Возвращает массив путей маршрута.
                         * @see https://tech.yandex.ru/maps/doc/jsapi/2.1/ref/reference/multiRouter.masstransit.Route-docpage/
                         */
                        route.getPaths().each(function (path) {
                            var coords = path.properties._data.coordinates[path.properties._data.coordinates.length-1];
                            ymaps.geocode(coords).then(function (res) {
                                var firstGeoObject = res.geoObjects.get(0);
                                $('#n-subhead').html(firstGeoObject.properties.get('name'));
                            });
                            /**
                             * Возвращает массив сегментов пути.
                             * @see https://tech.yandex.ru/maps/doc/jsapi/2.1/ref/reference/multiRouter.masstransit.Path-docpage/
                             */
                            path.getSegments().each(function (segment) {
                                step = segment.properties._data.distance.text;
                                $('#n-step').html(step);
                                if (segment.properties._data.type == "transport") {
                                   for (var i=0; i<segment.properties._data.transports.length; i++) {
                                       var transport = {
                                           name: '',
                                           type: ''
                                       };
                                       var prop;
                                       for (key in segment.properties._data.transports[i]) {
                                           if (key == "id" || key == "Types") { continue; }
                                           prop = segment.properties._data.transports[i][key];
                                            switch (prop) {
                                                case "bus" :
                                                    prop = "Автобус";
                                                    break;
                                                case "minibus" :
                                                    prop = "Маршрутка";
                                                    break;
                                                case "trolleybus" :
                                                    prop = "Троллейбус";
                                                    break;
                                            }
                                           transport[key] = prop;
                                       }
                                       transports.push(transport);
                                   }
                                }
                            });
                        });
                    });
                    appendData(transports);
                    $('.n-infoblock__timer span').html(time);
                },
                function (err) {
                    throw err;
                }, this
            );
        }
    }

    function appendData(data) {
        for (var i=0; i<data.length; i++) {
            switch (data[i].type) {
                case "Автобус" :
                    $('#bus').html(data[i].type);
                    $('#bus-val').html($('#bus-val').html() + '<span>' + data[i].name + '</span>');
                    break;
                case "Маршрутка" :
                    $('#subbus').html(data[i].type);
                    $('#subbus-val').html($('#subbus-val').html() + '<span>' + data[i].name + '</span>');
                    break;
                case "Троллейбус" :
                    $('#trollbus').html(data[i].type);
                    $('#trollbus-val').html($('#trollbus-val').html() + '<span>' + data[i].name + '</span>');
                    break;
            }
        }
    }

    $('#n-1').click(function(){
        if ($(this).hasClass('active')) {
            $('.n-part__plan__check').removeClass('active');
            $(this).removeClass('active');
            $('.n-part__plan__wrap li').removeClass('active');
            $('.n-part__plan__wrap li').eq(1).removeClass('active');
            $('.n-part__plan__wrap li').eq(0).addClass('active');
        } else {
            $('.n-part__plan__check').removeClass('active');
            $(this).addClass('active');
            $('.n-part__plan__wrap li').removeClass('active');
            $('.n-part__plan__wrap li').eq(1).addClass('active');
        }
    });
    $('#n-2').click(function(){
        if ($(this).hasClass('active')) {
            $('.n-part__plan__check').removeClass('active');
            $(this).removeClass('active');
            $('.n-part__plan__wrap li').removeClass('active');
            $('.n-part__plan__wrap li').eq(2).removeClass('active');
            $('.n-part__plan__wrap li').eq(0).addClass('active');
        } else {
            $('.n-part__plan__check').removeClass('active');
            $(this).addClass('active');
            $('.n-part__plan__wrap li').removeClass('active');
            $('.n-part__plan__wrap li').eq(2).addClass('active');
        }
    });
    $('#n-3').click(function(){
        if ($(this).hasClass('active')) {
            $('.n-part__plan__check').removeClass('active');
            $(this).removeClass('active');
            $('.n-part__plan__wrap li').removeClass('active');
            $('.n-part__plan__wrap li').eq(3).removeClass('active');
            $('.n-part__plan__wrap li').eq(0).addClass('active');
        } else {
            $('.n-part__plan__check').removeClass('active');
            $(this).addClass('active');
            $('.n-part__plan__wrap li').removeClass('active');
            $('.n-part__plan__wrap li').eq(3).addClass('active');
        }
    });
})();