"""
    Lists are used to store multiple items in a single variable.
     List items are ordered(If I run every time they maintain the specific sequence in which elements are inserted ), changeable, and allow duplicate values.
"""

thislist = ['apple','banana','mango']
print(thislist) # answer: ['apple','banana','mango']

# I can also create list by constructor: list()
thislist = list(('hello','world','ki'))
print(thislist) # answer : ['hello','world','ki']



# Access list item
# method 1: 
for i in range(len(thislist)):
    print(thislist[i]) # asnwer: hello \n world \n ki
print("===================================")
# method 2:
for fruits in thislist:
    print(fruits)  # asnwer: hello \n world \n ki

# add item to the list: 
animals = ['bandor','haati','ghora','dhora khap']
user_input = str(input("Enter one fav animal name: "))
animals.append(user_input)  # append method add new value at the end of the list
print(animals) # ['bandor', 'haati', 'ghora', 'dhora khap', 'monkey']

