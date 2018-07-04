angular.module('control', ['rzModule'])
    .directive('dchart', function() {
        return {
            restrict: 'A',
            transclude: true,
            scope: {},
            link: function(scope, elem) {
                ctx = elem[0].getContext('2d'),
                    startingData = {
                        labels: [],
                        datasets: [{
                            data: []
                        }]
                    }


                // Reduce the animation steps for demo clarity.
                var myLiveChart = new Chart(ctx, {
                    type: 'line',
                    data: startingData,
                    options: {
                        animationSteps: 5,
                        title: {
                            display: false
                        },
                        legend: {
                            display: false
                        },
                        tooltips: {
                            enabled: false
                        },
                        scales: {
                            yAxes: [{
                                display: true,
                                type: 'linear',
                                ticks: {
                                    beginAtZero: true,
                                    max: 1000
                                }
                            }]
                        }
                    }
                });

                var lastData = [];

                var updating = false;
                scope.$on('chart-update', function(e, args) {
                    if (args.data && !updating) {
                        updating = true;

                        if (args.data.length != lastData.length) {
                            var labels = []
                            var ndata = []
                            var interval = parseInt(args.data.length / 15)
                            var next = 0

                            for (var i = 1; i <= args.data.length; i++) {
                                if (next == 0) {
                                    labels.push(i)
                                    next = interval
                                } else {
                                    labels.push('')
                                    next--
                                }
                                ndata.push(0);
                            }
                            myLiveChart.data.labels = labels;
                            myLiveChart.data.datasets[0].data = ndata;
                        }

                        for (var i = 0; i < args.data.length; i++) {
                            myLiveChart.data.datasets[0].data[i] = args.data[i];
                        }
                        if (args.color) {
                            var color = 'rgba(' + args.color.r + ',' + args.color.g + ',' + args.color.b + ',' + args.color.alpha / 100 + ')'
                            myLiveChart.data.datasets[0].backgroundColor = color
                        }
                        myLiveChart.update()
                        updating = false;
                    }
                })
            }
        };
    })
    .controller('MainCtrl', function($scope, $http) {
        var wsTimeout = null;

        function connectWebsocket() {
            var ws = new WebSocket("ws://" + document.location.host + "/");

            ws.onconnect = function() {
                if (wsTimeout) clearInterval(wsTimeout)
            }

            ws.onmessage = function(e) {
                // Receives a message.
                var jdata = JSON.parse(e.data);
                $scope.$broadcast('chart-update', {
                    data: jdata.d,
                    color: jdata.c
                })
            };

            ws.onclose = function() {
                if (wsTimeout) return

                wsTimeout = setInterval(connectWebsocket, 5000)
            }
        }

        connectWebsocket()


        $scope.config = {};
        $scope.updating = false;
        $http.get('/config').then(function(resp) {
            $scope.config = resp.data;
        });

        var music = {
            "profile": "music",
            "trim": 5,
            "saturation": 1000,
            "scale": 100,
            "b_area": [0.6, 1, 1.7],
            "clapper": true,
            "sample_size": 64,
            "active": true,
            "speed": 1,
            "r_area": [0.33, 0.7, 2.4],
            "g_area": [0.04, 0.3, 1.4]
        };

        var speech = {
            "profile": "speech",
            "trim": 10,
            "saturation": 7050,
            "scale": 100,
            "b_area": [0.29, 0.53, 3.1],
            "clapper": false,
            "sample_size": 64,
            "active": true,
            "speed": 1,
            "r_area": [0.23, 0.54, 2.1],
            "g_area": [0, 0.22, 2.7]
        };
        $scope.settings = {
            "speech": speech,
            "music": music
        };

        $scope.load = function(profile) {
            $scope.config = $scope.settings[profile];
            $scope.update();
        };


        $scope.profile = {};

        $scope.area_slider = {
            floor: 0,
            ceil: 1,
            step: 0.01,
            precision: 2
        };

        $scope.toggle = function() {
            $scope.config.active = !$scope.config.active;
            $scope.update();
        };

        $scope.update = function() {
            $scope.updating = true;
            $http.post('/config', $scope.config).then(function() {
                $scope.updating = false;
            }, function() {
                $scope.updating = false;
            })
        };
        $scope.reset = function() {
            $http.post('/reset_config').then(function(resp) {
                $scope.config = resp.data;
            })
        }
    });
