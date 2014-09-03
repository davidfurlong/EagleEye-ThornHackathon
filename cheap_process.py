import nltk
import re 
import numpy as np
from collections import defaultdict
import os
import time
import pandas as pd
from os import system
import md5


def race(text):
    text = text.lower()
    terms = ['asia','white','latino','black','']
    l = []
    for t in terms:
        m = re.match('.*?{}.*?'.format(t),text)
        if m: 
            l.append(t)
    return l

def age(text):
    text = text.lower()
    num = re.match('.*?(\d+)[yo| yo|yr| Year Old| Years Old].*?(\d+)[yo| yo|yr| Year Old| Years Old| anos].*?',text)
    if num:
        return map(lambda x: int(x),num.groups())
    else:
        return None

def age_terms(text):
    text = text.lower()
    terms = ['toddler','kindergarten','preteen','teen','underage','baby','young','lolita']
    l = []
    for t in terms:
        m = re.match('.*?{}.*?'.format(t),text)
        if m: 
            l.append(t)
    if l:
        return l
    else:
        None


def subjects(text):
    text = text.lower()
    terms = ['boy','girl','mom','dad','sister','brother','man','father']
    l = []
    for t in terms:
        m = re.match('.*?{}.*?'.format(t),text)
        if m: 
            l.append(t)
    if l:
        return l
    else:
        None


def orientation(text):
    text = text.lower()
    terms = ['lesbian','gay']
    l = []
    for t in terms:
        m = re.match('.*?{}.*?'.format(t),text)
        if m: 
            l.append(t)
            
    if l:
        return l
    else:
        None
        
def advertising(text):
    text = text.lower()
    terms = ['new','pthc']
    l = []
    for t in terms:
        m = re.match('.*?{}.*?'.format(t),text)
        if m: 
            l.append(t)
    if l:
        return l
    else:
        None


def type_of_action(text):
    text = text.lower()
    terms = ['hussyfan','hard','father','pedo','oral','brother','incest','molest','daddy','masturbat','suck','blow','lolita','slave','fuck','sister','ass','anal']
    l = []
    for t in terms:
        m = re.match('.*?{}.*?'.format(t),text)
        if m: 
            l.append(t)
    if l:
        return l
    else:
        None


def processText(text):
    text.split('')

def id_pthc(text,string):
    if re.match('.*?{}.*?$'.format(string),text.lower()):
        return 1
    else:
        return 0
def text_query(df,string):
    df['{}_file'.format(string)] = df['FileName'].apply(lambda x: id_pthc(x,string))

#load all files
#for each file, 
#add columns to mapping

list_of_functions = [race,age,age_terms,subjects,orientation,advertising,type_of_action]


def replaceWithID(text,title_dic):
	if text in title_dic:
		return title_dic[text]
	else:
		title_count =len(title_dic)+1
		title_dic[text] = title_count
		return title_count

def write_dict(afile,dic,dic_name):
	with open('{}_{}'.format(dic_name,afile[:-4]),'w') as f:
		for k,v in dic.iteritems():
			f.write('{}:{}\n'.format(k,v))


file_names = defaultdict(int)
user_ids = defaultdict(int)
title = ''

mypath = 'p2p_tsv_orig/'
files = os.listdir(mypath)

def process_file(afile):
	file_names = {}
	user_ids = {}
	t = time.time()
	outfile = open('{}_OUT.tsv'.format(afile[:-4]),'w')
	with open(mypath+afile,'r') as f:
		title = f.next()
		for i,text in enumerate(f):	
			strings = text.split('\t')

			datestamp = strings[0]
			ip = strings[1]
			uiud = strings[2].split('|')[1]
			title = strings[3]
			size = strings[4]
			City = strings[7]
			RegionCode = strings[8]
			CountryCode = strings[9]
			CountryName = strings[10]
			FileExtension = strings[11].replace('\n','')

			extract = [f(title) for f in list_of_functions]
			
			# title_id = replaceWithID(title,file_names,number)
			# uiud_id = replaceWithID(uiud,user_ids,number)

			title_id = md5.md5(title).hexdigest()[:10]
			uiud_id = md5.md5(uiud).hexdigest()[:5]
			
			if uiud not in user_ids:
				user_ids[uiud] = uiud_id

			if title not in file_names:
				file_names[title] = title_id

			toWrite = "\t".join(map(lambda x: str(x), [datestamp,ip,title_id,uiud_id,size,City,RegionCode,CountryCode,CountryName,FileExtension] + extract))
			outfile.write(toWrite+'\n')

		print "%s took: %s seconds" % (afile,time.time() - t)
		
		
		write_dict(afile,user_ids,'user_ids')
		write_dict(afile,file_names,'file_names')
		
		outfile.close()

import multiprocessing
p = multiprocessing.Pool(8)

p.map(process_file, files)

system('say done')

	
title = [title[0],title[1],title[2],title[3],title[4],title[7],title[8],title[9],title[10],title[11]] +  [f.func_name for f in list_of_functions]
print "\t".join(title)


#now join all of these together. 
#join the dictionaries together to make one table - HASHKEY -> FILE NAME
#give cosmos 3 files: 
# 1. hashed filename 
# 2. complete cat'd file_names
# 3. 
