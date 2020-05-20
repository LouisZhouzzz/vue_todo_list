/*
* author:
* louiszhou
* */

;(function () {
    //事件调度器,用于任意组件通信
    var Event = new Vue();

    //增加5. 增加提示音功能   设置蜂鸣声
    // var beep = new window.Audio('media/beep.wav');  //标签外 浏览器外经常不叫
    var beep = document.getElementById('beep');  //这样再标签外,浏览器外有时候不叫

    //封装copy() 用于拷贝对象
    function copy(obj){
        //Object.assign() 方法用于将所有可枚举属性的值从一个或多个源对象复制到目标对象
        //它将返回目标对象
        return Object.assign({},obj);
    }

    Vue.component('task',{
        template:'#task-tpl',
        props:['todo'],
        methods: {
            //组件向main大元素通信,任意组件通信,用事件调度器,一个发送自定义事件+ 附带参数, 在大域里监听事件
            action:function (name,params) { //click触发这个方法,来发送事件+参数

                Event.$emit(name,params); //发送自定义事件名,给参数
            }
        },
    });

    new Vue({
        el:'#main',
        data:{
            current:{},
            list:[],
            last_id:0,
        },
        mounted:function () {

            var me = this;//先保存下main这个域,因为用Event时,this变成了Event 给了引用
            //在域加载时就从localStorage里取出数据  遍历显示在界面上,这个在localStorage里,
            //不去主动取,开始list是空的.  域里的list与localStorage里的list不是自动绑定的
            // console.log('list:',this.list);
            // 必须用this.list 在js里其他方法里   单独list不可见
            //否则未定义,局部函数里显示未定义,不可见   html里可以直接用data里的变量
            this.list = ms.get('list') ||this.list;
            this.last_id = ms.get('last_id') ||this.last_id;

            //处理定时提醒功能
            setInterval(function () {
                me.check_alerts();
            }, 1000);
            
            //组件挂载完毕时监听事件,任意组件间通信
            Event.$on('remove',function (id) {
                if (id){
                    me.remove(id); //必须用me引用,因为this变成了Event了
                }
            });
            Event.$on('set_current',function (todo) {
                if (todo){
                    me.set_current(todo); //必须用me引用,因为this变成了Event了
                }
            });
            Event.$on('toggle_detail',function (id) {
                if (id){
                    me.toggle_detail(id); //必须用me引用,因为this变成了Event了
                }
            });
            Event.$on('toggle_complete',function (id) {
                if (id){
                    me.toggle_complete(id); //必须用me引用,因为this变成了Event了
                }
            });
        },
        methods:{
            //封装在前端数据库localStorage里查找id的方法  封装方法 供merge方法用  更语义化
            find_index_by_id:function(id){
                // 对数组每个元素执行回调func
                //数组的查找方法findIndex() 返回符合要求的第一个索引  因为id唯一所以只有一个 就是
                return this.list.findIndex(function (item) {
                    return item.id == id;
                })
            },

            set_current:function(todo){
                this.current = copy(todo);
                //修改时候就把todo给了current,后面用提交表单触发merge方法里用current
                //相当于php把数据库变量取出存到表单上变量,表单再提交再触发用表单变量 赋给数据库变量
            },
            //封装方法 供merge方法用  更语义化
            reset_current:function(){
                this.set_current({});
            },

            merge:function () {
                var id;
                var is_update = id = this.current.id;

                //如有有id则修改已有的对象,没有则增加
                if (is_update){
                    //查找 返回满足条件的第一个元素的索引,这里让item.id == is_update
                    var index = this.find_index_by_id(id);

                    //增加2.输入不能小于当前时间
                    var alert_at = this.current.alert_at;
                    // console.log('alert_at:',alert_at);
                    //增加3 如果已完成 不能再修改提醒时间不让重设提醒, 否则已完成里重设时间变成为未提醒 倒置到未完成变已提醒
                    var completed= this.current.completed;
                    if (alert_at){
                        if (completed){
                            if (alert_at!== this.list[index].alert_at ) {
                                alert('已完成的任务不能再修改提醒时间!');
                                return; //返回 不存新的提醒时间
                            }
                        }

                        var alert_at_time = (new Date(alert_at)).getTime() ;
                        var now = (new Date()).getTime() ;
                        if (alert_at_time<=now){
                            alert('输入的时间不能小于当前时间,请重新输入');
                            return; //必须返回否则点确定后,还是会执行下面 ,还是错误时间存进去了
                            //用return或者用else{放Vue.set}
                        }
                    }
                    //Vue修改数组方式          更新数组的的元素(是个对象)
                    Vue.set(this.list,index,copy(this.current));
                    //增加4.重新设置新的提醒时间, 需要把alert_confirmed改为false
                    Vue.set(this.list[index],'alert_confirmed',false);

                }else{
                    //不存在id,添加新的对象  到list数组里
                    var title = this.current.title;

                    //判断下title ,title 不能为空/0 再存
                    if (!title && title !==0){
                        return;
                    } else{

                        // 存到前端数据库localStorage
                        var todo = copy(this.current);

                        this.last_id++; //id自增需要自己控制,不像mysql自动的,  tp5还有增删改查封装的api
                        ms.set('last_id',this.last_id); //存到localStorage
                        todo.id = this.last_id;

                        console.log("todo:", todo);
                        this.list.push(todo); //把todo对象推进list数组
                        //curent对象是html页面上的 赋给 todo对象是js操作里的参数 把todo存到list里

                        console.log('list:',this.list);
                        //还没有把list存进localstorage 数据无法持久, 在这里Vue.set()
                        //不够,这只是增加时候存了, 更新时候还没,可以两处都写存,删除修改多了
                        //在侦听器 watch里写更好
                    }
                }
                this.reset_current();//添加新的todo后,重置currentW为空  清空
            },
            remove:function (id) {
                var index = this.find_index_by_id(id); //根据id找到索引
                //splice()方法从数组中增加/删除项目,然后返回被删除的项目
                //会改变原始数组
                var a = this.list.splice(index,1); //从索引处开始,删除一个元素
                console.log('删除的a对象:',a);
            },
            toggle_detail:function (id) {
                var index = this.find_index_by_id(id);
                //通过传进来的id找到数据库对象中的索引
                //导致是否显示变量属性, 有watch监听
                // 这样没用,只是改变内存里的,没用改变localstorage
                //  this.list[index].show_detail = !this.list[index].show_detail
                // 要存localstorage  是设置元素属性,  ! undefined
                Vue.set(this.list[index],'show_detail',!this.list[index].show_detail);
            },
            toggle_complete:function (id) {
                var index = this.find_index_by_id(id);
                // 不行: 增加1.重置时应该把提醒调会未提醒  新加的点完成变已提醒

                // 已完成任务到时间调未完成会有提醒(正常),再倒置还会提醒,说完成了应该不用提示了,因为倒置修改了以提示  ,    变成没有提示又已经到期.
                //修改1: 不用倒置提醒  ,  完成直接赋值,已提示 ,并且不让按钮倒回 | 因为未完成不一定是未提示,时间到了,要判断才能知道 直接不是未提示,倒置会有问题重复提示
                // Vue.set(this.list[index],'alert_confirmed',!this.list[index].alert_confirmed);
                Vue.set(this.list[index],'alert_confirmed',true);

                Vue.set(this.list[index],'completed',!this.list[index].completed);
            },
            check_alerts:function () {
                var me = this;
                this.list.forEach(function (row,index) {
                    if(!row.alert_at || row.alert_confirmed){
                        //未设定提醒时间或者已经提醒过了就 直接不执行了
                        return;
                    }else{
                        var alert_at = (new Date(row.alert_at)).getTime() ;
                        // new Date()是日期对象 获取当前年月日...毫秒  没new直接Date()是字符串
                        var now = (new Date()).getTime() ;
                        //getTime():从1970年到现在过去多少毫秒
                        if (now>=alert_at) {
                            //过了时间就提醒 mounted里面每秒检测一遍

                            //beep播放在前,play()经常会被confirm()打断报错,并且出去标签页/程序步响
                                beep.play(); //先播放

                                var confirmed = confirm(row.title);  //confirm()弹出提醒 确认/取消
                                console.log('confirmed:',confirmed);
                                Vue.set(me.list[index],'alert_confirmed',confirmed);
                        }
                    }
                })
            }
        },
        watch:{
            // 侦听器
            list:{
                deep:true, //深度监听
                //对监听对象的属性变化有用  因为默认handler只监听obj这个属性它的引用的变化
                // 只有给obj赋值时才会监听到  监听对象的单个属性,需要deep:true,默认false
                //监听器会一层层的往下遍历，给对象的所有属性都加上这个监听器，但是这样性能开销就会非常大了，
                // 任何修改obj里面任何一个属性都会触发这个监听器里的 handler
                handler:function (new_val,old_val) {
                    if (new_val) {
                        ms.set('list',new_val);
                    }else{
                        me.set('list',[]);
                    }
                }
            }
        }
    });
})();
