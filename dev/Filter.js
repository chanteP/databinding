var filter = {
    /*
        a,b,c | map({a:1,b:2,c:3};,) => 1,2,3
    */
    'map' : function(rs, extra, json, multiMark){
        var map = JSON.parse(json);
        if(!multiMark){
            rs = [rs];
        }
        var rsGroup = rs.split(multiMark);
        return rsGroup.map(function(rs){
            return map[rs] === undefined ? '' : map[rs];
        }).join(multiMark);
    },
    /*
        
    */
    'text-overflow' : function(rs, extra, num, holder){
        num = num || 16;
        holder = holder || '...';
        if(rs && rs.toString().length > num){
            rs = rs.slice(0, num) + holder;
        }
        return rs;
    },

    'date' : function(rs, extra, num, holder){

    }
};

module.exports = {
    list : filter,
    register : function(name, func){
        filter[name] = func;
    }
}