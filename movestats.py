from flask import Flask, render_template, request
import pymysql
import json
import logging
import os
from datetime import datetime

logging.basicConfig(filename=os.path.expanduser('~/flask.log'), level = logging.DEBUG)

app = Flask(__name__, static_url_path='/movestats/static')

moves_sql = '''
select user_id, user_name, user_editcount,
        timestampdiff (HOUR, str_to_date(user_registration, '%Y%m%d%H%i%s'), now())/24 as registered_time,
	count(log_id) as moves, count(distinct log_namespace) as ns_count
from user, logging_userindex
where user_id = log_user and (log_action = 'move' or log_action = 'move_redir') and user_id > {} {}
group by user_id {} {};
'''

edits_sql = '''
select user_id, user_name, user_editcount,
        timestampdiff (MINUTE, str_to_date(user_registration, '%Y%m%d%H%i%s'), now()) as registered_time,
        exists (select 1 from ipblocks where ipb_user = user_id) as blocked
from user
where user_editcount > 0
order by user_id desc
limit {};
'''

@app.route('/movestats/')
def main_page():
    return render_template('stats.html')

def connect():
    return pymysql.connect(host='enwiki.labsdb',
                                 read_default_file='~/replica.my.cnf',
                                 db='enwiki_p',
                                 charset='utf8mb4',
                                 cursorclass=pymysql.cursors.DictCursor)

@app.route('/movestats/data/moves/')
def move_data():
    connection = connect()
    usercount = request.args.get('usercount', 100)
    sql = 'select user_id from user order by user_id desc limit 1;'
    cursor = connection.cursor()
    cursor.execute(sql)
    result = cursor.fetchall()
    user_id_limit = int(result[0]['user_id']) - int(usercount)

    namespaces = ','.join(request.args.get('namespaces', '').split('|'))
    if len(namespaces) > 0:
        namespaces = 'and log_namespace in ({})'.format(namespaces)
    else:
        namespaces = ''
    multi_ns = request.args.get('multi_ns', "false")
    multi_ns = 'having count(distinct log_namespace) > 1' if multi_ns == 'true' else ''
    union = request.args.get("union", "false");
    union = "having count(distinct log_namespace) >= {}".format(len(request.args.get('namespaces', '').split('|'))) if union == 'true' else ''

    sql = moves_sql.format(user_id_limit, namespaces, multi_ns, union)
    cursor = connection.cursor()
    cursor.execute(sql)
    result = cursor.fetchall()
    for r in result:
        r['user_name'] = r['user_name'].decode('utf8')
        r['registered_time'] = float(r['registered_time'])
    return json.dumps(result)

@app.route('/movestats/data/edits/')
def edit_data():
    connection = connect()
    usercount = request.args.get('usercount', 1000)
    cursor = connection.cursor()
    cursor.execute(edits_sql.format(usercount))
    result = cursor.fetchall()
    for r in result:
        r['user_name'] = r['user_name'].decode('utf8')
        r['registered_time'] = float(r['registered_time'])
    return json.dumps(result)

if __name__ == '__main__':
    app.run()

@app.route('/movestats/data/user_edits/<username>/<int:page>')
def user_edits(username, page):
    
