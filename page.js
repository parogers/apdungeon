function onload()
{
    var div = document.getElementById("canvas_area");
    var width = window.innerWidth-5;
    var height = window.innerHeight-5;
    div.style.width = width + "px";
    div.style.height = height + "px";

    apdungeon.start('canvas_area');

    window.addEventListener("resize", () => {
        var div = document.getElementById("canvas_area");
        var width = window.innerWidth-5;
        var height = window.innerHeight-5;
        div.style.width = width + "px";
        div.style.height = height + "px";

        apdungeon.resize();
    });
}
