var observeID = 1;
var core = window.note;
var aiID = function(){
    return 'nt_' + observeID++;
}

describe('base observer test',function() {
    it('new define test',function(){
        var data = {};
        var nt = note(aiID(), data);
        assert.equal(nt, data);
    });
    it('base change',function() {
        var nt = note(aiID(), {
            a : 1
        });
        nt.a++;
        assert.equal(nt.a, 2);
    });
    it('base observe',function() {
        var nt = note(aiID(), {
            a : 1
        });
        nt.observe('a', function(v, ov){
            assert.equal(v, 2);
            assert.equal(ov, 1);
        });
        nt.a++;
    });
});